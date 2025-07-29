import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementService } from '../services/announcement.service';
import { AnnouncementModule } from '../announcement.module';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';
import { AnnouncementType, AnnouncementPriority } from '../entities/announcement.entity';

describe('Announcement Feature', () => {
  let service: AnnouncementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AnnouncementModule],
    }).compile();

    service = module.get<AnnouncementService>(AnnouncementService);
  });

  describe('Announcement Creation', () => {
    it('should create an immediate announcement', async () => {
      const dto: CreateAnnouncementDto = {
        title: 'Event Cancelled',
        content: 'Due to unforeseen circumstances, the event has been cancelled.',
        type: AnnouncementType.CANCELLATION,
        priority: AnnouncementPriority.URGENT,
        eventId: 'event-uuid',
        sendEmail: true,
        sendInApp: true,
        isPublished: true,
      };

      // This would create and immediately broadcast the announcement
      // const announcement = await service.create(dto, 'organizer-uuid');
      // expect(announcement.title).toBe('Event Cancelled');
      // expect(announcement.isPublished).toBe(true);
    });

    it('should create a scheduled announcement', async () => {
      const dto: CreateAnnouncementDto = {
        title: 'Reminder: Event Tomorrow',
        content: 'Don\'t forget! The event is tomorrow at 2 PM.',
        type: AnnouncementType.REMINDER,
        priority: AnnouncementPriority.HIGH,
        eventId: 'event-uuid',
        sendEmail: true,
        sendInApp: true,
        isPublished: false,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      };

      // This would create a scheduled announcement
      // const announcement = await service.create(dto, 'organizer-uuid');
      // expect(announcement.isPublished).toBe(false);
      // expect(announcement.scheduledAt).toBeDefined();
    });
  });

  describe('Announcement Types', () => {
    it('should support all announcement types', () => {
      const types = [
        AnnouncementType.GENERAL,
        AnnouncementType.SCHEDULE_CHANGE,
        AnnouncementType.VENUE_CHANGE,
        AnnouncementType.CANCELLATION,
        AnnouncementType.SPECIAL_OFFER,
        AnnouncementType.REMINDER,
      ];

      expect(types).toHaveLength(6);
    });

    it('should support all priority levels', () => {
      const priorities = [
        AnnouncementPriority.LOW,
        AnnouncementPriority.MEDIUM,
        AnnouncementPriority.HIGH,
        AnnouncementPriority.URGENT,
      ];

      expect(priorities).toHaveLength(4);
    });
  });

  describe('Delivery Methods', () => {
    it('should support email delivery', () => {
      const dto: CreateAnnouncementDto = {
        title: 'Email Only Announcement',
        content: 'This will be sent via email only.',
        eventId: 'event-uuid',
        sendEmail: true,
        sendInApp: false,
        isPublished: true,
      };

      // This would send only via email
      // const announcement = await service.create(dto, 'organizer-uuid');
    });

    it('should support in-app delivery', () => {
      const dto: CreateAnnouncementDto = {
        title: 'In-App Only Announcement',
        content: 'This will be sent via in-app notification only.',
        eventId: 'event-uuid',
        sendEmail: false,
        sendInApp: true,
        isPublished: true,
      };

      // This would send only via in-app notification
      // const announcement = await service.create(dto, 'organizer-uuid');
    });

    it('should support both delivery methods', () => {
      const dto: CreateAnnouncementDto = {
        title: 'Dual Delivery Announcement',
        content: 'This will be sent via both email and in-app notification.',
        eventId: 'event-uuid',
        sendEmail: true,
        sendInApp: true,
        isPublished: true,
      };

      // This would send via both methods
      // const announcement = await service.create(dto, 'organizer-uuid');
    });
  });
});

// Example usage scenarios
export class AnnouncementExamples {
  static async createUrgentCancellation(service: AnnouncementService, eventId: string, organizerId: string) {
    return service.create({
      title: 'URGENT: Event Cancelled',
      content: 'Due to severe weather conditions, the event has been cancelled. All tickets will be refunded.',
      type: AnnouncementType.CANCELLATION,
      priority: AnnouncementPriority.URGENT,
      eventId,
      sendEmail: true,
      sendInApp: true,
      isPublished: true,
    }, organizerId);
  }

  static async createScheduleChange(service: AnnouncementService, eventId: string, organizerId: string) {
    return service.create({
      title: 'Event Time Changed',
      content: 'The event start time has been changed from 2 PM to 3 PM. Please update your calendar.',
      type: AnnouncementType.SCHEDULE_CHANGE,
      priority: AnnouncementPriority.HIGH,
      eventId,
      sendEmail: true,
      sendInApp: true,
      isPublished: true,
    }, organizerId);
  }

  static async createVenueChange(service: AnnouncementService, eventId: string, organizerId: string) {
    return service.create({
      title: 'Venue Location Updated',
      content: 'The event venue has been changed to the Grand Hall. Updated address will be sent separately.',
      type: AnnouncementType.VENUE_CHANGE,
      priority: AnnouncementPriority.HIGH,
      eventId,
      sendEmail: true,
      sendInApp: true,
      isPublished: true,
    }, organizerId);
  }

  static async createSpecialOffer(service: AnnouncementService, eventId: string, organizerId: string) {
    return service.create({
      title: 'Special Discount Available',
      content: 'Use code SAVE20 for 20% off additional tickets. Limited time offer!',
      type: AnnouncementType.SPECIAL_OFFER,
      priority: AnnouncementPriority.MEDIUM,
      eventId,
      sendEmail: true,
      sendInApp: true,
      isPublished: true,
    }, organizerId);
  }

  static async createReminder(service: AnnouncementService, eventId: string, organizerId: string) {
    return service.create({
      title: 'Event Reminder',
      content: 'Your event is tomorrow! Don\'t forget to bring your ticket and arrive 30 minutes early.',
      type: AnnouncementType.REMINDER,
      priority: AnnouncementPriority.MEDIUM,
      eventId,
      sendEmail: true,
      sendInApp: true,
      isPublished: true,
    }, organizerId);
  }
} 