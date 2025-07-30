import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsAuthGuard } from '../../src/ticket-stats/guards/ws-auth.guard';
import { Socket } from 'socket.io';

describe('WsAuthGuard', () => {
  let guard: WsAuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let mockSocket: Partial<Socket>;

  beforeEach(async () => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as any;

    configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsAuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    guard = module.get<WsAuthGuard>(WsAuthGuard);

    mockSocket = {
      handshake: {
        auth: { token: 'valid-token' },
        headers: {},
      },
      data: {},
      disconnect: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow valid organizer tokens', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-123',
      email: 'organizer@test.com',
      role: 'organizer',
    });

    const result = await guard.canActivate(mockSocket as Socket);

    expect(result).toBe(true);
    expect(mockSocket.data.user).toEqual({
      sub: 'user-123',
      email: 'organizer@test.com',
      role: 'organizer',
    });
  });

  it('should reject non-organizer tokens', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-123',
      email: 'user@test.com',
      role: 'user',
    });

    const result = await guard.canActivate(mockSocket as Socket);

    expect(result).toBe(false);
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('should reject invalid tokens', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

    const result = await guard.canActivate(mockSocket as Socket);

    expect(result).toBe(false);
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('should reject connections without tokens', async () => {
    mockSocket.handshake = { auth: {}, headers: {} };

    const result = await guard.canActivate(mockSocket as Socket);

    expect(result).toBe(false);
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('should extract token from authorization header', async () => {
    mockSocket.handshake = {
      auth: {},
      headers: { authorization: 'Bearer header-token' },
    };

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-123',
      role: 'organizer',
    });

    const result = await guard.canActivate(mockSocket as Socket);

    expect(result).toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith(
      'header-token',
      expect.any(Object),
    );
  });
});

// test/ticket-stats/ticket-stats.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TicketStatsService } from '../../src/ticket-stats/ticket-stats.service';
import { TicketStatsGateway } from '../../src/ticket-stats/ticket-stats.gateway';
import { TicketPurchaseDto } from '../../src/ticket-stats/dto/ticket-stats.dto';

describe('TicketStatsService', () => {
  let service: TicketStatsService;
  let gateway: jest.Mocked<TicketStatsGateway>;

  beforeEach(async () => {
    gateway = {
      broadcastTicketSaleUpdate: jest.fn(),
      broadcastStatsUpdate: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketStatsService,
        { provide: TicketStatsGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<TicketStatsService>(TicketStatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with mock data', () => {
    const stats = service.getAllEventStats();
    expect(stats.has('event-123')).toBe(true);

    const eventStats = stats.get('event-123');
    expect(eventStats.totalTickets).toBe(1000);
    expect(eventStats.soldTickets).toBe(750);
  });

  it('should process ticket sales and update stats', async () => {
    const purchaseData: TicketPurchaseDto = {
      eventId: 'event-123',
      quantity: 5,
      amount: 500,
      userId: 'user-456',
    };

    const result = await service.onTicketSold(purchaseData);

    expect(result.soldTickets).toBe(755); // 750 + 5
    expect(result.availableTickets).toBe(245); // 250 - 5
    expect(result.revenue).toBe(75500); // 75000 + 500

    expect(gateway.broadcastTicketSaleUpdate).toHaveBeenCalledWith({
      eventId: 'event-123',
      ticketsSold: 5,
      revenue: 500,
      timestamp: expect.any(Date),
    });

    expect(gateway.broadcastStatsUpdate).toHaveBeenCalledWith(result);
  });

  it('should throw error for non-existent events', async () => {
    const purchaseData: TicketPurchaseDto = {
      eventId: 'non-existent',
      quantity: 1,
      amount: 100,
      userId: 'user-456',
    };

    await expect(service.onTicketSold(purchaseData)).rejects.toThrow(
      'Event non-existent not found',
    );
  });

  it('should get event stats', async () => {
    const stats = await service.getEventStats('event-123');

    expect(stats).toBeDefined();
    expect(stats.eventId).toBe('event-123');
  });

  it('should return null for non-existent event stats', async () => {
    const stats = await service.getEventStats('non-existent');
    expect(stats).toBeNull();
  });

  it('should broadcast periodic stats updates', async () => {
    await service.broadcastPeriodicStatsUpdate('event-123');

    expect(gateway.broadcastStatsUpdate).toHaveBeenCalled();

    const call = gateway.broadcastStatsUpdate.mock.calls[0][0];
    expect(call.eventId).toBe('event-123');
    expect(call.lastUpdated).toBeInstanceOf(Date);
  });
});
