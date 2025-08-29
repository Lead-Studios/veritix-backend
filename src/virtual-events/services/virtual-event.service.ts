import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VirtualEvent } from '../entities/virtual-event.entity';
import { VirtualEventAttendee } from '../entities/virtual-event-attendee.entity';
import { VirtualTicket } from '../entities/virtual-ticket.entity';
import { StreamingPlatformService, StreamingConfig } from './streaming-platform.service';
import { CreateVirtualEventDto } from '../dto/create-virtual-event.dto';
import { UpdateVirtualEventDto } from '../dto/update-virtual-event.dto';
import { VirtualEventStatus, EventType } from '../enums/virtual-event.enum';

@Injectable()
export class VirtualEventService {
  private readonly logger = new Logger(VirtualEventService.name);

  constructor(
    @InjectRepository(VirtualEvent)
    private readonly virtualEventRepository: Repository<VirtualEvent>,
    @InjectRepository(VirtualEventAttendee)
    private readonly attendeeRepository: Repository<VirtualEventAttendee>,
    @InjectRepository(VirtualTicket)
    private readonly virtualTicketRepository: Repository<VirtualTicket>,
    private readonly streamingPlatformService: StreamingPlatformService,
  ) {}

  async create(createVirtualEventDto: CreateVirtualEventDto): Promise<VirtualEvent> {
    try {
      const virtualEvent = this.virtualEventRepository.create(createVirtualEventDto);
      
      // Create streaming session if platform is specified
      if (virtualEvent.streamingPlatform && createVirtualEventDto.platformCredentials) {
        const streamingConfig: StreamingConfig = {
          platform: virtualEvent.streamingPlatform,
          credentials: createVirtualEventDto.platformCredentials,
          settings: createVirtualEventDto.streamingSettings || {},
        };

        const session = await this.streamingPlatformService.createStreamingSession(streamingConfig);
        
        virtualEvent.streamUrl = session.streamUrl;
        virtualEvent.streamKey = session.streamKey;
        virtualEvent.meetingId = session.meetingId;
        virtualEvent.meetingPassword = session.password;
        virtualEvent.webinarId = session.sessionId;
      }

      const savedEvent = await this.virtualEventRepository.save(virtualEvent);
      this.logger.log(`Created virtual event: ${savedEvent.id}`);
      
      return savedEvent;
    } catch (error) {
      this.logger.error('Failed to create virtual event', error);
      throw new BadRequestException('Failed to create virtual event');
    }
  }

  async findAll(eventId?: string): Promise<VirtualEvent[]> {
    const query = this.virtualEventRepository.createQueryBuilder('virtualEvent')
      .leftJoinAndSelect('virtualEvent.attendees', 'attendees')
      .leftJoinAndSelect('virtualEvent.recordings', 'recordings')
      .leftJoinAndSelect('virtualEvent.breakoutRooms', 'breakoutRooms');

    if (eventId) {
      query.where('virtualEvent.eventId = :eventId', { eventId });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<VirtualEvent> {
    const virtualEvent = await this.virtualEventRepository.findOne({
      where: { id },
      relations: ['attendees', 'recordings', 'breakoutRooms', 'interactions'],
    });

    if (!virtualEvent) {
      throw new NotFoundException('Virtual event not found');
    }

    return virtualEvent;
  }

  async update(id: string, updateVirtualEventDto: UpdateVirtualEventDto): Promise<VirtualEvent> {
    const virtualEvent = await this.findOne(id);
    
    // Update streaming session if platform settings changed
    if (updateVirtualEventDto.platformCredentials || updateVirtualEventDto.streamingSettings) {
      const streamingConfig: StreamingConfig = {
        platform: virtualEvent.streamingPlatform,
        credentials: updateVirtualEventDto.platformCredentials || virtualEvent.platformCredentials,
        settings: updateVirtualEventDto.streamingSettings || virtualEvent.streamingSettings,
      };

      try {
        await this.streamingPlatformService.updateStreamingSession(
          virtualEvent.webinarId,
          virtualEvent.streamingPlatform,
          streamingConfig,
        );
      } catch (error) {
        this.logger.warn('Failed to update streaming session', error);
      }
    }

    Object.assign(virtualEvent, updateVirtualEventDto);
    return this.virtualEventRepository.save(virtualEvent);
  }

  async remove(id: string): Promise<void> {
    const virtualEvent = await this.findOne(id);
    
    // Clean up streaming session
    if (virtualEvent.webinarId) {
      try {
        await this.streamingPlatformService.deleteStreamingSession(
          virtualEvent.webinarId,
          virtualEvent.streamingPlatform,
        );
      } catch (error) {
        this.logger.warn('Failed to delete streaming session', error);
      }
    }

    await this.virtualEventRepository.softDelete(id);
    this.logger.log(`Deleted virtual event: ${id}`);
  }

  async startEvent(id: string): Promise<VirtualEvent> {
    const virtualEvent = await this.findOne(id);
    
    if (virtualEvent.status === VirtualEventStatus.LIVE) {
      throw new BadRequestException('Event is already live');
    }

    // Start streaming session
    if (virtualEvent.webinarId) {
      try {
        await this.streamingPlatformService.startStreaming(
          virtualEvent.webinarId,
          virtualEvent.streamingPlatform,
        );
      } catch (error) {
        this.logger.error('Failed to start streaming session', error);
      }
    }

    virtualEvent.status = VirtualEventStatus.LIVE;
    virtualEvent.isLive = true;
    virtualEvent.actualStartTime = new Date();
    
    const updatedEvent = await this.virtualEventRepository.save(virtualEvent);
    this.logger.log(`Started virtual event: ${id}`);
    
    return updatedEvent;
  }

  async endEvent(id: string): Promise<VirtualEvent> {
    const virtualEvent = await this.findOne(id);
    
    if (virtualEvent.status !== VirtualEventStatus.LIVE) {
      throw new BadRequestException('Event is not currently live');
    }

    // Stop streaming session
    if (virtualEvent.webinarId) {
      try {
        await this.streamingPlatformService.stopStreaming(
          virtualEvent.webinarId,
          virtualEvent.streamingPlatform,
        );
      } catch (error) {
        this.logger.error('Failed to stop streaming session', error);
      }
    }

    virtualEvent.status = VirtualEventStatus.ENDED;
    virtualEvent.isLive = false;
    virtualEvent.actualEndTime = new Date();
    
    const updatedEvent = await this.virtualEventRepository.save(virtualEvent);
    this.logger.log(`Ended virtual event: ${id}`);
    
    return updatedEvent;
  }

  async joinEvent(virtualEventId: string, userId: string, guestInfo?: { name: string; email: string }): Promise<VirtualEventAttendee> {
    const virtualEvent = await this.findOne(virtualEventId);
    
    if (virtualEvent.status !== VirtualEventStatus.LIVE) {
      throw new BadRequestException('Event is not currently live');
    }

    if (virtualEvent.currentAttendees >= virtualEvent.maxAttendees && virtualEvent.maxAttendees > 0) {
      throw new BadRequestException('Event has reached maximum capacity');
    }

    // Check if user is already in the event
    const existingAttendee = await this.attendeeRepository.findOne({
      where: { virtualEventId, userId, leftAt: null },
    });

    if (existingAttendee) {
      throw new BadRequestException('User is already in the event');
    }

    const attendee = this.attendeeRepository.create({
      virtualEventId,
      userId,
      guestName: guestInfo?.name,
      guestEmail: guestInfo?.email,
      joinedAt: new Date(),
      lastActivity: new Date(),
    });

    const savedAttendee = await this.attendeeRepository.save(attendee);

    // Update current attendees count
    await this.virtualEventRepository.increment({ id: virtualEventId }, 'currentAttendees', 1);
    
    // Update peak attendees if necessary
    const updatedEvent = await this.findOne(virtualEventId);
    if (updatedEvent.currentAttendees > updatedEvent.peakAttendees) {
      await this.virtualEventRepository.update(virtualEventId, { 
        peakAttendees: updatedEvent.currentAttendees 
      });
    }

    this.logger.log(`User ${userId} joined virtual event: ${virtualEventId}`);
    return savedAttendee;
  }

  async leaveEvent(virtualEventId: string, userId: string): Promise<void> {
    const attendee = await this.attendeeRepository.findOne({
      where: { virtualEventId, userId, leftAt: null },
    });

    if (!attendee) {
      throw new NotFoundException('Attendee not found in event');
    }

    const leftAt = new Date();
    const totalDuration = Math.floor((leftAt.getTime() - attendee.joinedAt.getTime()) / 1000);

    await this.attendeeRepository.update(attendee.id, {
      leftAt,
      totalDuration,
    });

    // Update current attendees count
    await this.virtualEventRepository.decrement({ id: virtualEventId }, 'currentAttendees', 1);

    this.logger.log(`User ${userId} left virtual event: ${virtualEventId}`);
  }

  async getEventAttendees(virtualEventId: string): Promise<VirtualEventAttendee[]> {
    return this.attendeeRepository.find({
      where: { virtualEventId },
      relations: ['user'],
      order: { joinedAt: 'DESC' },
    });
  }

  async getCurrentAttendees(virtualEventId: string): Promise<VirtualEventAttendee[]> {
    return this.attendeeRepository.find({
      where: { virtualEventId, leftAt: null },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }

  async updateAttendeeStatus(
    virtualEventId: string,
    userId: string,
    updates: Partial<VirtualEventAttendee>,
  ): Promise<VirtualEventAttendee> {
    const attendee = await this.attendeeRepository.findOne({
      where: { virtualEventId, userId, leftAt: null },
    });

    if (!attendee) {
      throw new NotFoundException('Attendee not found in event');
    }

    Object.assign(attendee, updates);
    attendee.lastActivity = new Date();
    
    return this.attendeeRepository.save(attendee);
  }

  async generateVirtualTickets(virtualEventId: string, count: number, ticketData: Partial<VirtualTicket>): Promise<VirtualTicket[]> {
    const virtualEvent = await this.findOne(virtualEventId);
    const tickets: VirtualTicket[] = [];

    for (let i = 0; i < count; i++) {
      const ticket = this.virtualTicketRepository.create({
        ...ticketData,
        virtualEventId,
        ticketNumber: `VT-${Date.now()}-${i.toString().padStart(4, '0')}`,
        accessToken: this.generateAccessToken(),
      });

      tickets.push(ticket);
    }

    const savedTickets = await this.virtualTicketRepository.save(tickets);
    this.logger.log(`Generated ${count} virtual tickets for event: ${virtualEventId}`);
    
    return savedTickets;
  }

  async validateVirtualTicket(ticketNumber: string, accessToken: string): Promise<VirtualTicket> {
    const ticket = await this.virtualTicketRepository.findOne({
      where: { ticketNumber, accessToken },
      relations: ['virtualEvent', 'user'],
    });

    if (!ticket) {
      throw new NotFoundException('Invalid ticket or access token');
    }

    if (ticket.validFrom && new Date() < ticket.validFrom) {
      throw new BadRequestException('Ticket is not yet valid');
    }

    if (ticket.validUntil && new Date() > ticket.validUntil) {
      throw new BadRequestException('Ticket has expired');
    }

    if (ticket.currentSessions >= ticket.maxConcurrentSessions) {
      throw new BadRequestException('Maximum concurrent sessions reached');
    }

    return ticket;
  }

  private generateAccessToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}
