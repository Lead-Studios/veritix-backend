// src/attendee/attendee.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendee } from './entities/attendee.entity';
import { Ticket } from './entities/ticket.entity';
import { Conference } from '../conference/entities/conference.entity';
import { Session } from '../conference/entities/session.entity';
import { CreateAttendeeDto } from './dto/create-attendee.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { BadgeService } from '../badge/badge.service';

@Injectable()
export class AttendeeService {
  constructor(
    @InjectRepository(Attendee)
    private attendeeRepository: Repository<Attendee>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(Conference)
    private conferenceRepository: Repository<Conference>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private badgeService: BadgeService,
  ) {}

  async createAttendee(createAttendeeDto: CreateAttendeeDto): Promise<Attendee> {
    const attendee = this.attendeeRepository.create(createAttendeeDto);
    return this.attendeeRepository.save(attendee);
  }

  async createTicket(createTicketDto: CreateTicketDto): Promise<Ticket> {
    const { attendeeId, conferenceId, sessionIds, type } = createTicketDto;

    const attendee = await this.attendeeRepository.findOne({ where: { id: attendeeId } });
    if (!attendee) {
      throw new NotFoundException(`Attendee with ID ${attendeeId} not found`);
    }

    const conference = await this.conferenceRepository.findOne({ where: { id: conferenceId } });
    if (!conference) {
      throw new NotFoundException(`Conference with ID ${conferenceId} not found`);
    }

    const ticket = this.ticketRepository.create({
      type,
      attendee,
      conference,
    });

    // Add sessions if provided
    if (sessionIds && sessionIds.length > 0) {
      const sessions = await this.sessionRepository.findByIds(sessionIds);
      ticket.registeredSessions = sessions;
    }

    const savedTicket = await this.ticketRepository.save(ticket);

    // Generate badge automatically after ticket creation
    await this.badgeService.generateBadge(savedTicket.id);

    return this.ticketRepository.findOne({
      where: { id: savedTicket.id },
      relations: ['attendee', 'conference', 'registeredSessions'],
    });
  }

  async getAttendeeTickets(attendeeId: string): Promise<Ticket[]> {
    const attendee = await this.attendeeRepository.findOne({
      where: { id: attendeeId },
      relations: ['tickets', 'tickets.conference'],
    });

    if (!attendee) {
      throw new NotFoundException(`Attendee with ID ${attendeeId} not found`);
    }

    return attendee.tickets;
  }
}

// src/attendee/attendee.controller.ts
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { AttendeeService } from './attendee.service';
import { CreateAttendeeDto } from './dto/create-attendee.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Controller('attendees')
export class AttendeeController {
  constructor(private readonly attendeeService: AttendeeService) {}

  @Post()
  async createAttendee(@Body() createAttendeeDto: CreateAttendeeDto) {
    return this.attendeeService.createAttendee(createAttendeeDto);
  }

  @Post('tickets')
  async createTicket(@Body() createTicketDto: CreateTicketDto) {
    return this.attendeeService.createTicket(createTicketDto);
  }

  @Get(':id/tickets')
  async getAttendeeTickets(@Param('id') id: string) {
    return this.attendeeService.getAttendeeTickets(id);
  }
}