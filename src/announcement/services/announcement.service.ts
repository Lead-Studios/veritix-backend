import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Announcement, AnnouncementType, AnnouncementPriority } from '../entities/announcement.entity';
import { AnnouncementDelivery, DeliveryStatus, DeliveryMethod } from '../entities/announcement-delivery.entity';
import { Event } from '../../events/entities/event.entity';
import { User } from '../../user/entities/user.entity';
import { Ticket } from '../../ticket/entities/ticket.entity';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';
import { UpdateAnnouncementDto } from '../dto/update-announcement.dto';
import { EmailService } from '../../user/services/email.service';
import { NotificationService } from '../../notification/services/notification.service';

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepo: Repository<Announcement>,
    @InjectRepository(AnnouncementDelivery)
    private readonly deliveryRepo: Repository<AnnouncementDelivery>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(dto: CreateAnnouncementDto, userId: string): Promise<Announcement> {
    const event = await this.eventRepo.findOne({ where: { id: dto.eventId } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if user is the organizer or has admin rights
    if (event.organizer?.id !== userId) {
      throw new ForbiddenException('Only event organizers can create announcements');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const announcement = this.announcementRepo.create({
      ...dto,
      event,
      createdBy: user,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
    });

    const savedAnnouncement = await this.announcementRepo.save(announcement);

    // If published immediately, broadcast to ticket holders
    if (savedAnnouncement.isPublished) {
      await this.broadcastAnnouncement(savedAnnouncement.id);
    }

    return savedAnnouncement;
  }

  async update(id: string, dto: UpdateAnnouncementDto, userId: string): Promise<Announcement> {
    const announcement = await this.announcementRepo.findOne({
      where: { id },
      relations: ['event', 'event.organizer'],
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    if (announcement.event.organizer?.id !== userId) {
      throw new ForbiddenException('Only event organizers can update announcements');
    }

    const wasPublished = announcement.isPublished;
    const willBePublished = dto.isPublished ?? announcement.isPublished;

    Object.assign(announcement, {
      ...dto,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : announcement.scheduledAt,
    });

    const updatedAnnouncement = await this.announcementRepo.save(announcement);

    // If newly published, broadcast to ticket holders
    if (!wasPublished && willBePublished) {
      await this.broadcastAnnouncement(updatedAnnouncement.id);
    }

    return updatedAnnouncement;
  }

  async delete(id: string, userId: string): Promise<void> {
    const announcement = await this.announcementRepo.findOne({
      where: { id },
      relations: ['event', 'event.organizer'],
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    if (announcement.event.organizer?.id !== userId) {
      throw new ForbiddenException('Only event organizers can delete announcements');
    }

    await this.announcementRepo.delete(id);
  }

  async findEventAnnouncements(eventId: string, userId: string): Promise<Announcement[]> {
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Only organizers can see all announcements, others see only published ones
    const whereClause = event.organizer?.id === userId 
      ? { event: { id: eventId } }
      : { event: { id: eventId }, isPublished: true };

    return this.announcementRepo.find({
      where: whereClause,
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findUserAnnouncements(userId: string, page = 1, limit = 20): Promise<{
    data: Announcement[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Get events where user has tickets
    const userTickets = await this.ticketRepo.find({
      where: { createdBy: { id: userId } },
      relations: ['event'],
    });

    const eventIds = [...new Set(userTickets.map(ticket => ticket.event.id))];

    if (eventIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const [announcements, total] = await this.announcementRepo.findAndCount({
      where: {
        event: { id: In(eventIds) },
        isPublished: true,
      },
      relations: ['event', 'createdBy'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: announcements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async broadcastAnnouncement(announcementId: string): Promise<void> {
    const announcement = await this.announcementRepo.findOne({
      where: { id: announcementId },
      relations: ['event', 'event.tickets', 'event.tickets.createdBy'],
    });

    if (!announcement || !announcement.isPublished) {
      throw new BadRequestException('Announcement not found or not published');
    }

    // Get unique ticket holders
    const ticketHolders = [...new Set(
      announcement.event.tickets
        .filter(ticket => ticket.createdBy)
        .map(ticket => ticket.createdBy)
    )];

    const deliveries: AnnouncementDelivery[] = [];

    for (const user of ticketHolders) {
      if (announcement.sendEmail) {
        deliveries.push(
          this.deliveryRepo.create({
            announcement,
            user,
            method: DeliveryMethod.EMAIL,
            status: DeliveryStatus.PENDING,
          })
        );
      }

      if (announcement.sendInApp) {
        deliveries.push(
          this.deliveryRepo.create({
            announcement,
            user,
            method: DeliveryMethod.IN_APP,
            status: DeliveryStatus.PENDING,
          })
        );
      }
    }

    await this.deliveryRepo.save(deliveries);

    // Process deliveries asynchronously
    await this.processDeliveries(announcementId);
  }

  private async processDeliveries(announcementId: string): Promise<void> {
    const deliveries = await this.deliveryRepo.find({
      where: { announcement: { id: announcementId }, status: DeliveryStatus.PENDING },
      relations: ['announcement', 'user'],
    });

    for (const delivery of deliveries) {
      try {
        if (delivery.method === DeliveryMethod.EMAIL) {
          await this.sendEmailAnnouncement(delivery);
        } else if (delivery.method === DeliveryMethod.IN_APP) {
          await this.sendInAppAnnouncement(delivery);
        }

        delivery.status = DeliveryStatus.SENT;
        delivery.sentAt = new Date();
      } catch (error) {
        delivery.status = DeliveryStatus.FAILED;
        delivery.errorMessage = error.message;
      }

      await this.deliveryRepo.save(delivery);
    }

    // Update announcement counts
    await this.updateAnnouncementCounts(announcementId);
  }

  private async sendEmailAnnouncement(delivery: AnnouncementDelivery): Promise<void> {
    const { announcement, user } = delivery;
    
    await this.emailService.sendAnnouncementEmail(user.email, {
      subject: announcement.title,
      content: announcement.content,
      eventName: announcement.event.name,
      eventId: announcement.event.id,
      announcementType: announcement.type,
      priority: announcement.priority,
    });
  }

  private async sendInAppAnnouncement(delivery: AnnouncementDelivery): Promise<void> {
    const { announcement, user } = delivery;
    
    // Create in-app notification
    await this.notificationService.addNotification(
      user.id,
      announcement.event.id,
      `[${announcement.type.toUpperCase()}] ${announcement.title}: ${announcement.content}`
    );
  }

  private async updateAnnouncementCounts(announcementId: string): Promise<void> {
    const [emailCount, inAppCount] = await Promise.all([
      this.deliveryRepo.count({
        where: {
          announcement: { id: announcementId },
          method: DeliveryMethod.EMAIL,
          status: DeliveryStatus.SENT,
        },
      }),
      this.deliveryRepo.count({
        where: {
          announcement: { id: announcementId },
          method: DeliveryMethod.IN_APP,
          status: DeliveryStatus.SENT,
        },
      }),
    ]);

    await this.announcementRepo.update(announcementId, {
      emailSentCount: emailCount,
      inAppSentCount: inAppCount,
    });
  }

  async getDeliveryStats(announcementId: string, userId: string): Promise<{
    totalDeliveries: number;
    emailDeliveries: number;
    inAppDeliveries: number;
    sentCount: number;
    failedCount: number;
    readCount: number;
  }> {
    const announcement = await this.announcementRepo.findOne({
      where: { id: announcementId },
      relations: ['event', 'event.organizer'],
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    if (announcement.event.organizer?.id !== userId) {
      throw new ForbiddenException('Only event organizers can view delivery stats');
    }

    const deliveries = await this.deliveryRepo.find({
      where: { announcement: { id: announcementId } },
    });

    const stats = {
      totalDeliveries: deliveries.length,
      emailDeliveries: deliveries.filter(d => d.method === DeliveryMethod.EMAIL).length,
      inAppDeliveries: deliveries.filter(d => d.method === DeliveryMethod.IN_APP).length,
      sentCount: deliveries.filter(d => d.status === DeliveryStatus.SENT).length,
      failedCount: deliveries.filter(d => d.status === DeliveryStatus.FAILED).length,
      readCount: deliveries.filter(d => d.status === DeliveryStatus.READ).length,
    };

    return stats;
  }
} 