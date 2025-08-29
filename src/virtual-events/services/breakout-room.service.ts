import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BreakoutRoom } from '../entities/breakout-room.entity';
import { VirtualEvent } from '../entities/virtual-event.entity';
import { VirtualEventAttendee } from '../entities/virtual-event-attendee.entity';
import { BreakoutRoomStatus } from '../enums/virtual-event.enum';
import { CreateBreakoutRoomDto } from '../dto/create-breakout-room.dto';

@Injectable()
export class BreakoutRoomService {
  private readonly logger = new Logger(BreakoutRoomService.name);

  constructor(
    @InjectRepository(BreakoutRoom)
    private readonly breakoutRoomRepository: Repository<BreakoutRoom>,
    @InjectRepository(VirtualEvent)
    private readonly virtualEventRepository: Repository<VirtualEvent>,
    @InjectRepository(VirtualEventAttendee)
    private readonly attendeeRepository: Repository<VirtualEventAttendee>,
  ) {}

  async createBreakoutRoom(createBreakoutRoomDto: CreateBreakoutRoomDto): Promise<BreakoutRoom> {
    const virtualEvent = await this.virtualEventRepository.findOne({
      where: { id: createBreakoutRoomDto.virtualEventId },
    });

    if (!virtualEvent) {
      throw new NotFoundException('Virtual event not found');
    }

    if (!virtualEvent.allowBreakoutRooms) {
      throw new BadRequestException('Breakout rooms are not enabled for this event');
    }

    const breakoutRoom = this.breakoutRoomRepository.create({
      ...createBreakoutRoomDto,
      roomUrl: this.generateRoomUrl(createBreakoutRoomDto.virtualEventId),
      roomPassword: this.generateRoomPassword(),
    });

    const savedRoom = await this.breakoutRoomRepository.save(breakoutRoom);
    this.logger.log(`Created breakout room: ${savedRoom.id} for event: ${createBreakoutRoomDto.virtualEventId}`);
    
    return savedRoom;
  }

  async getBreakoutRooms(virtualEventId: string): Promise<BreakoutRoom[]> {
    return this.breakoutRoomRepository.find({
      where: { virtualEventId },
      order: { createdAt: 'ASC' },
    });
  }

  async getBreakoutRoom(roomId: string): Promise<BreakoutRoom> {
    const room = await this.breakoutRoomRepository.findOne({
      where: { id: roomId },
      relations: ['participants'],
    });

    if (!room) {
      throw new NotFoundException('Breakout room not found');
    }

    return room;
  }

  async joinBreakoutRoom(roomId: string, userId: string): Promise<BreakoutRoom> {
    const room = await this.getBreakoutRoom(roomId);

    if (room.status !== BreakoutRoomStatus.AVAILABLE) {
      throw new BadRequestException('Breakout room is not available');
    }

    if (room.currentParticipants >= room.maxParticipants) {
      throw new BadRequestException('Breakout room is full');
    }

    // Check if user is in the main event
    const attendee = await this.attendeeRepository.findOne({
      where: { virtualEventId: room.virtualEventId, userId, leftAt: null },
    });

    if (!attendee) {
      throw new BadRequestException('User is not in the main event');
    }

    // Add user to participants list
    const participantsList = room.participantsList || [];
    if (!participantsList.includes(userId)) {
      participantsList.push(userId);
      
      await this.breakoutRoomRepository.update(roomId, {
        participantsList,
        currentParticipants: participantsList.length,
      });

      // Update attendee's breakout room
      await this.attendeeRepository.update(attendee.id, {
        breakoutRoomId: roomId,
      });
    }

    this.logger.log(`User ${userId} joined breakout room: ${roomId}`);
    return this.getBreakoutRoom(roomId);
  }

  async leaveBreakoutRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.getBreakoutRoom(roomId);
    
    const participantsList = room.participantsList || [];
    const updatedParticipants = participantsList.filter(id => id !== userId);

    await this.breakoutRoomRepository.update(roomId, {
      participantsList: updatedParticipants,
      currentParticipants: updatedParticipants.length,
    });

    // Update attendee's breakout room
    const attendee = await this.attendeeRepository.findOne({
      where: { virtualEventId: room.virtualEventId, userId, leftAt: null },
    });

    if (attendee) {
      await this.attendeeRepository.update(attendee.id, {
        breakoutRoomId: null,
      });
    }

    this.logger.log(`User ${userId} left breakout room: ${roomId}`);
  }

  async startBreakoutRoom(roomId: string): Promise<BreakoutRoom> {
    const room = await this.getBreakoutRoom(roomId);

    if (room.status !== BreakoutRoomStatus.AVAILABLE) {
      throw new BadRequestException('Breakout room cannot be started');
    }

    await this.breakoutRoomRepository.update(roomId, {
      status: BreakoutRoomStatus.OCCUPIED,
      actualStartTime: new Date(),
    });

    this.logger.log(`Started breakout room: ${roomId}`);
    return this.getBreakoutRoom(roomId);
  }

  async endBreakoutRoom(roomId: string): Promise<BreakoutRoom> {
    const room = await this.getBreakoutRoom(roomId);

    if (room.status !== BreakoutRoomStatus.OCCUPIED) {
      throw new BadRequestException('Breakout room is not currently active');
    }

    const endTime = new Date();
    const duration = room.actualStartTime ? 
      Math.floor((endTime.getTime() - room.actualStartTime.getTime()) / 1000) : 0;

    await this.breakoutRoomRepository.update(roomId, {
      status: BreakoutRoomStatus.AVAILABLE,
      actualEndTime: endTime,
      totalDuration: duration,
      participantsList: [],
      currentParticipants: 0,
    });

    // Remove all attendees from this breakout room
    await this.attendeeRepository.update(
      { breakoutRoomId: roomId },
      { breakoutRoomId: null },
    );

    this.logger.log(`Ended breakout room: ${roomId}`);
    return this.getBreakoutRoom(roomId);
  }

  async deleteBreakoutRoom(roomId: string): Promise<void> {
    const room = await this.getBreakoutRoom(roomId);

    if (room.status === BreakoutRoomStatus.OCCUPIED) {
      await this.endBreakoutRoom(roomId);
    }

    await this.breakoutRoomRepository.softDelete(roomId);
    this.logger.log(`Deleted breakout room: ${roomId}`);
  }

  async addModerator(roomId: string, userId: string): Promise<BreakoutRoom> {
    const room = await this.getBreakoutRoom(roomId);
    
    const moderators = room.moderators || [];
    if (!moderators.includes(userId)) {
      moderators.push(userId);
      
      await this.breakoutRoomRepository.update(roomId, {
        moderators,
      });
    }

    return this.getBreakoutRoom(roomId);
  }

  async removeModerator(roomId: string, userId: string): Promise<BreakoutRoom> {
    const room = await this.getBreakoutRoom(roomId);
    
    const moderators = room.moderators || [];
    const updatedModerators = moderators.filter(id => id !== userId);

    await this.breakoutRoomRepository.update(roomId, {
      moderators: updatedModerators,
    });

    return this.getBreakoutRoom(roomId);
  }

  async getBreakoutRoomAnalytics(roomId: string): Promise<any> {
    const room = await this.getBreakoutRoom(roomId);
    
    return {
      roomId: room.id,
      name: room.name,
      totalSessions: room.actualStartTime ? 1 : 0,
      totalDuration: room.totalDuration,
      maxParticipants: room.maxParticipants,
      peakParticipants: room.currentParticipants,
      currentParticipants: room.currentParticipants,
      status: room.status,
      createdAt: room.createdAt,
      lastActivity: room.updatedAt,
    };
  }

  private generateRoomUrl(virtualEventId: string): string {
    const roomId = Math.random().toString(36).substring(2, 15);
    return `https://meet.veritix.com/breakout/${virtualEventId}/${roomId}`;
  }

  private generateRoomPassword(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}
