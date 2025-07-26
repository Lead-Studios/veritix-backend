import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from '../../src/controllers/example.controller';

describe('EventsController', () => {
  let controller: EventsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
    }).compile();

    controller = module.get<EventsController>(EventsController);
  });

  describe('getEvents', () => {
    it('should return events with organizer ID', async () => {
      const result = await controller.getEvents('org_1');

      expect(result).toEqual({
        message: 'Events retrieved successfully',
        organizerId: 'org_1',
        timestamp: expect.any(String),
      });
    });
  });

  describe('getEvent', () => {
    it('should return specific event', async () => {
      const result = await controller.getEvent('event_1', 'org_1');

      expect(result).toEqual({
        message: 'Event event_1 retrieved successfully',
        organizerId: 'org_1',
        timestamp: expect.any(String),
      });
    });
  });

  describe('getPublicEvent', () => {
    it('should return public event without organizer ID', async () => {
      const result = await controller.getPublicEvent('event_1');

      expect(result).toEqual({
        message: 'Public event event_1 retrieved successfully',
        timestamp: expect.any(String),
      });
    });
  });
});
