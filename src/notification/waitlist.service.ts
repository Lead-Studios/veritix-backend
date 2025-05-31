import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { WaitlistEntry } from "./entities/waitlist-entry.entity";
import { NotificationService } from "./notification.service";
import { Queue } from "bull";
import { InjectQueue } from "@nestjs/bull";
import { User } from "src/users/entities/user.entity";
import { Event } from "src/events/entities/event.entity";

@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(WaitlistEntry)
    private waitlistRepository: Repository<WaitlistEntry>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectQueue("notification")
    private notificationQueue: Queue,
    private notificationService: NotificationService,
  ) {}

  async joinWaitlist(userId: string, eventId: string): Promise<WaitlistEntry> {
    // Check if event exists
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException("Event not found");
    }

    // Check if user exists
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if user is already on waitlist
    const existingEntry = await this.waitlistRepository.findOne({
      where: { userId, eventId, isActive: true },
    });
    if (existingEntry) {
      throw new ConflictException("User already on waitlist for this event");
    }

    // Create waitlist entry
    const waitlistEntry = this.waitlistRepository.create({
      userId,
      eventId,
      email: user.email,
    });

    return await this.waitlistRepository.save(waitlistEntry);
  }

  async getWaitlistPosition(userId: string, eventId: string): Promise<number> {
    const entries = await this.waitlistRepository.find({
      where: { eventId, isActive: true },
      order: { createdAt: "ASC" },
    });

    const position = entries.findIndex((entry) => entry.userId === userId);
    return position === -1 ? -1 : position + 1;
  }

  async notifyWaitlistUsers(
    eventId: string,
    availableTickets: number,
  ): Promise<void> {
    // Get top N users from waitlist
    const waitlistEntries = await this.waitlistRepository.find({
      where: { eventId, isActive: true },
      order: { createdAt: "ASC" },
      take: availableTickets,
      relations: ["user", "event"],
    });

    if (waitlistEntries.length === 0) return;

    // Add notification jobs to queue
    for (const entry of waitlistEntries) {
      await this.notificationQueue.add("ticket-available", {
        userId: entry.userId,
        eventId: entry.eventId,
        email: entry.email,
        eventName: entry.event.eventName,
        waitlistEntryId: entry.id,
      });
    }

    // Mark entries as notified (deactivate them)
    await this.waitlistRepository.update(
      { id: In(waitlistEntries.map((e) => e.id)) },
      { isActive: false },
    );
  }

  async removeFromWaitlist(userId: string, eventId: string): Promise<void> {
    await this.waitlistRepository.update(
      { userId, eventId, isActive: true },
      { isActive: false },
    );
  }

  async getEventWaitlistCount(eventId: string): Promise<number> {
    return await this.waitlistRepository.count({
      where: { eventId, isActive: true },
    });
  }
}
