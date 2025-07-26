import { Test, TestingModule } from '@nestjs/testing';
import { TicketController } from '../../src/ticket-stats/ticket.controller';
import { TicketStatsService } from '../../src/ticket-stats/ticket-stats.service';
import { TicketPurchaseDto } from '../../src/ticket-stats/dto/ticket-stats.dto';

describe('TicketController', () => {
  let controller: TicketController;
  let service: jest.Mocked<TicketStatsService>;

  beforeEach(async () => {
    service = {
      onTicketSold: jest.fn(),
      getEventStats: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketController],
      providers: [{ provide: TicketStatsService, useValue: service }],
    }).compile();

    controller = module.get<TicketController>(TicketController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should process ticket purchases', async () => {
    const purchaseData: TicketPurchaseDto = {
      eventId: 'event-123',
      quantity: 2,
      amount: 200,
      userId: 'user-456',
    };

    const mockStats = {
      eventId: 'event-123',
      totalTickets: 1000,
      soldTickets: 752,
      availableTickets: 248,
      revenue: 75200,
      salesVelocity: 12.8,
      lastUpdated: new Date(),
    };

    service.onTicketSold.mockResolvedValue(mockStats);

    const result = await controller.purchaseTicket(purchaseData);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Ticket purchased successfully');
    expect(result.stats).toEqual(mockStats);
    expect(service.onTicketSold).toHaveBeenCalledWith(purchaseData);
  });

  it('should get event stats', async () => {
    const mockStats = {
      eventId: 'event-123',
      totalTickets: 1000,
      soldTickets: 750,
      availableTickets: 250,
      revenue: 75000,
      salesVelocity: 12.5,
      lastUpdated: new Date(),
    };

    service.getEventStats.mockResolvedValue(mockStats);

    const result = await controller.getEventStats('event-123');

    expect(result.success).toBe(true);
    expect(result.stats).toEqual(mockStats);
    expect(service.getEventStats).toHaveBeenCalledWith('event-123');
  });
});