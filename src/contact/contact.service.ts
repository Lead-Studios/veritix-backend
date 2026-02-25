import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  ContactInquiry,
  ContactSummary,
  ContactStatus,
  ContactCategory,
  CreateContactData,
  UpdateContactData,
  ContactFilterOptions,
} from './interfaces/contact.interface';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { ContactMessage } from './entities/contact-message.entity';
import {
  ContactQueryDto,
  UpdateContactDto,
} from './dto/contact-operations.dto';
import { EmailService } from '../auth/helper/email-sender';

export interface PaginatedContactResult {
  data: ContactMessage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @InjectRepository(ContactMessage)
    private readonly contactRepo: Repository<ContactMessage>,
    private readonly emailService: EmailService,
  ) {}

  // ─── Public submission ────────────────────────────────────────────────────

  async create(dto: CreateContactMessageDto): Promise<ContactMessage> {
    const message = this.contactRepo.create({
      ...dto,
      status: ContactStatus.NEW,
      category: ContactCategory.GENERAL,
    });
    return this.contactRepo.save(message);
  }

  // ─── findAll with filters and pagination ─────────────────────────────────

  async findAll(query: ContactQueryDto): Promise<PaginatedContactResult> {
    const {
      status,
      category,
      assignedTo,
      userId,
      eventId,
      search,
      priority,
      dateFrom,
      dateTo,
      tags,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const qb: SelectQueryBuilder<ContactMessage> = this.contactRepo
      .createQueryBuilder('c')
      .orderBy(`c.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('c.status = :status', { status });
    if (category) qb.andWhere('c.category = :category', { category });
    if (assignedTo) qb.andWhere('c.assignedTo = :assignedTo', { assignedTo });
    if (userId) qb.andWhere('c.userId = :userId', { userId });
    if (eventId) qb.andWhere('c.eventId = :eventId', { eventId });
    if (priority) qb.andWhere('c.priority = :priority', { priority });

    if (search) {
      qb.andWhere(
        '(c.name ILIKE :search OR c.email ILIKE :search OR c.subject ILIKE :search OR c.message ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (dateFrom) {
      qb.andWhere('c.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }
    if (dateTo) {
      qb.andWhere('c.createdAt <= :dateTo', { dateTo: new Date(dateTo) });
    }

    if (tags) {
      // Tags are stored as comma-separated string; match any supplied tag
      const tagList = tags.split(',').map((t) => t.trim());
      tagList.forEach((tag, i) => {
        qb.andWhere(`c.tags ILIKE :tag${i}`, { [`tag${i}`]: `%${tag}%` });
      });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── findById ─────────────────────────────────────────────────────────────

  async findById(id: string): Promise<ContactMessage> {
    const message = await this.contactRepo.findOne({ where: { id } });
    if (!message) {
      throw new NotFoundException(`Contact inquiry with ID ${id} not found`);
    }
    return message;
  }

  // ─── findByUser ───────────────────────────────────────────────────────────

  async findByUser(userId: string): Promise<ContactMessage[]> {
    return this.contactRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── update (partial) ────────────────────────────────────────────────────

  async update(id: string, data: UpdateContactDto): Promise<ContactMessage> {
    const message = await this.findById(id);
    Object.assign(message, data);
    return this.contactRepo.save(message);
  }

  // ─── respond ─────────────────────────────────────────────────────────────

  async respond(
    id: string,
    response: string,
    responderId?: string,
  ): Promise<ContactMessage> {
    const message = await this.findById(id);

    message.response = response;
    message.status = ContactStatus.RESPONDED;
    message.respondedAt = new Date();
    if (responderId) message.assignedTo = responderId;

    const saved = await this.contactRepo.save(message);

    // Send email notification to submitter — non-fatal if it fails
    try {
      const html = this.buildResponseEmail(saved.name, saved.subject, response);
      await this.emailService.sendEmail(
        saved.email,
        `Re: ${saved.subject} – VeriTix Support`,
        html,
      );
    } catch (err) {
      this.logger.error(
        `Failed to send response email for inquiry ${id}: ${
          (err as Error).message
        }`,
        (err as Error).stack,
      );
    }

    return saved;
  }

  // ─── resolve ─────────────────────────────────────────────────────────────

  async resolve(id: string): Promise<ContactMessage> {
    const message = await this.findById(id);
    message.status = ContactStatus.RESOLVED;
    return this.contactRepo.save(message);
  }

  // ─── assign ──────────────────────────────────────────────────────────────

  async assign(id: string, staffId: string): Promise<ContactMessage> {
    const message = await this.findById(id);
    message.assignedTo = staffId;
    message.status = ContactStatus.REVIEWED;
    return this.contactRepo.save(message);
  }

  // ─── getStatusCounts ─────────────────────────────────────────────────────

  async getStatusCounts(): Promise<Record<ContactStatus, number>> {
    const rows = await this.contactRepo
      .createQueryBuilder('c')
      .select('c.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.status')
      .getRawMany<{ status: ContactStatus; count: string }>();

    // Seed every known status with 0 so callers always get a complete map
    const result: Record<ContactStatus, number> = {
      [ContactStatus.NEW]: 0,
      [ContactStatus.REVIEWED]: 0,
      [ContactStatus.RESPONDED]: 0,
      [ContactStatus.RESOLVED]: 0,
      [ContactStatus.CLOSED]: 0,
    };

    for (const row of rows) {
      result[row.status] = parseInt(row.count, 10);
    }

    return result;
  }

  // ─── delete ──────────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    const message = await this.findById(id); // throws 404 if not found
    await this.contactRepo.remove(message);
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  private buildResponseEmail(
    name: string,
    subject: string,
    response: string,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">VeriTix Support</h2>
        <p>Hi <strong>${this.escapeHtml(name)}</strong>,</p>
        <p>Thank you for contacting us. Here is our response to your inquiry
           <em>"${this.escapeHtml(subject)}"</em>:</p>
        <blockquote style="border-left: 4px solid #007bff; padding-left: 16px; color: #555;">
          ${this.escapeHtml(response).replace(/\n/g, '<br>')}
        </blockquote>
        <p>If you have any further questions, please don't hesitate to reply or
           submit a new inquiry at our website.</p>
        <p>Best regards,<br><strong>The VeriTix Team</strong></p>
      </div>
    `;
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
