import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../entities/ticket.entity';
import { CreateTicketDto } from '../dtos/create-ticket.dto';
import { UpdateTicketDto } from '../dtos/update-ticket.dto';
import { TicketResource } from '../resources/ticket.resource';
import { Event } from '../../event/entities/event.entity';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateTicketDto) {
    const event = await this.eventRepo.findOne({ where: { id: dto.eventId } });
    if (!event) throw new BadRequestException('Event not found');
    let createdBy: User | undefined;
    if (dto.createdById) {
      const user = await this.userRepo.findOne({ where: { id: dto.createdById } });
      if (!user) throw new BadRequestException('User not found');
      createdBy = user;
    }
    const ticket = this.ticketRepo.create({
      ...dto,
      event,
      createdBy,
    });
    return TicketResource.toResponse(await this.ticketRepo.save(ticket));
  }

  async findAll() {
    const tickets = await this.ticketRepo.find();
    return TicketResource.toArray(tickets);
  }

  async findOne(id: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return TicketResource.toResponse(ticket);
  }

  async findByEvent(eventId: string) {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new BadRequestException('Event not found');
    const tickets = await this.ticketRepo.find({ where: { event } });
    return TicketResource.toArray(tickets);
  }

  async update(id: string, dto: UpdateTicketDto) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (dto.eventId) {
      const event = await this.eventRepo.findOne({ where: { id: dto.eventId } });
      if (!event) throw new BadRequestException('Event not found');
      ticket.event = event;
    }
    if (dto.createdById) {
      const user = await this.userRepo.findOne({ where: { id: dto.createdById } });
      if (!user) throw new BadRequestException('User not found');
      ticket.createdBy = user;
    }
    Object.assign(ticket, dto);
    return TicketResource.toResponse(await this.ticketRepo.save(ticket));
  }

  async remove(id: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    await this.ticketRepo.delete(id);
    return { deleted: true };
  }
} 