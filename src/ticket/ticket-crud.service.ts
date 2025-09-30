import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './ticket.entity';
import { Event } from '../modules/event/event.entity';
import { User } from '../user/user.entity';
import { CreateTicketDto, CreateTicketStatusInput } from './dto/create-ticket.dto';
import { UpdateTicketDto, UpdateTicketStatusInput } from './dto/update-ticket.dto';

function mapInputToStatus(input?: CreateTicketStatusInput | UpdateTicketStatusInput): TicketStatus {
  if (!input || input === CreateTicketStatusInput.VALID || input === UpdateTicketStatusInput.VALID) {
    return TicketStatus.ACTIVE;
  }
  if (input === CreateTicketStatusInput.USED || input === UpdateTicketStatusInput.USED) {
    return TicketStatus.USED;
  }
  if (
    input === CreateTicketStatusInput.TRANSFERRED ||
    input === UpdateTicketStatusInput.TRANSFERRED
  ) {
    return TicketStatus.TRANSFERRED;
  }
  return TicketStatus.ACTIVE;
}

@Injectable()
export class TicketCrudService {
  constructor(
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Event) private readonly eventRepo: Repository<Event>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateTicketDto): Promise<Ticket> {
    const event = await this.eventRepo.findOne({ where: { id: dto.eventId } });
    if (!event) throw new BadRequestException('Event not found');

    const owner = await this.userRepo.findOne({ where: { id: dto.ownerId } });
    if (!owner) throw new BadRequestException('Owner not found');

    const status = mapInputToStatus(dto.status);

    const ticket = this.ticketRepo.create({
      status,
      ticketNumber: `T-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      originalPrice: event.ticketPrice,
      currentPrice: event.ticketPrice,
      purchaseDate: new Date(),
      transferCount: 0,
      event,
      originalOwner: owner,
      currentOwner: owner,
    });

    return this.ticketRepo.save(ticket);
  }

  async findOne(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: ['event', 'currentOwner', 'originalOwner'],
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.findOne(id);

    if (dto.status) {
      const newStatus = mapInputToStatus(dto.status);

      // Prevent setting TRANSFERRED via PATCH: use dedicated transfer flow
      if (newStatus === TicketStatus.TRANSFERRED) {
        throw new BadRequestException('Use transfer endpoint to transfer tickets');
      }

      // Basic lifecycle: ACTIVE -> USED is allowed; USED cannot revert to ACTIVE
      if (ticket.status === TicketStatus.USED && newStatus === TicketStatus.ACTIVE) {
        throw new BadRequestException('Cannot revert a used ticket to active');
      }

      ticket.status = newStatus;
    }

    return this.ticketRepo.save(ticket);
  }
}
