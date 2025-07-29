import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Socket, io as Client } from 'socket.io-client';
import { TicketStatsGateway } from '../../src/ticket-stats/ticket-stats.gateway';
import { WsAuthGuard } from '../../src/ticket-stats/guards/ws-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('TicketStatsGateway', () => {
  let app: INestApplication;
  let gateway: TicketStatsGateway;
  let clientSocket: Socket;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockJwtService = {
      verifyAsync: jest.fn(),
    } as any;

    mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketStatsGateway,
        {
          provide: WsAuthGuard,
          useValue: {
            canActivate: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    gateway = module.get<TicketStatsGateway>(TicketStatsGateway);

    await app.init();
  });

  afterEach(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    gateway.disconnectAll();
    await app.close();
  });

  describe('Connection', () => {
    it('should allow authenticated connections', (done) => {
      clientSocket = Client('http://localhost:3000/ticket-stats', {
        auth: { token: 'valid-token' },
        forceNew: true,
      });

      clientSocket.on('connected', (data) => {
        expect(data.message).toBe('Successfully connected to ticket stats');
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    it('should track connected clients', () => {
      expect(gateway.getConnectedClientsCount()).toBe(0);
    });
  });

  describe('Event Subscription', () => {
    beforeEach((done) => {
      clientSocket = Client('http://localhost:3000/ticket-stats', {
        auth: { token: 'valid-token' },
        forceNew: true,
      });

      clientSocket.on('connected', () => {
        done();
      });
    });

    it('should allow subscription to events', (done) => {
      clientSocket.emit('subscribe-to-event', { eventId: 'event-123' });

      clientSocket.on('subscription-confirmed', (data) => {
        expect(data.eventId).toBe('event-123');
        expect(data.message).toContain('Subscribed to real-time stats');
        done();
      });
    });

    it('should allow unsubscription from events', (done) => {
      // First subscribe
      clientSocket.emit('subscribe-to-event', { eventId: 'event-123' });

      clientSocket.on('subscription-confirmed', () => {
        // Then unsubscribe
        clientSocket.emit('unsubscribe-from-event', { eventId: 'event-123' });
      });

      clientSocket.on('unsubscription-confirmed', (data) => {
        expect(data.eventId).toBe('event-123');
        expect(data.message).toContain('Unsubscribed from event');
        done();
      });
    });

    it('should return current stats when requested', (done) => {
      clientSocket.emit('get-current-stats', { eventId: 'event-123' });

      clientSocket.on('current-stats', (stats) => {
        expect(stats.eventId).toBe('event-123');
        expect(stats.totalTickets).toBeDefined();
        expect(stats.soldTickets).toBeDefined();
        expect(stats.revenue).toBeDefined();
        done();
      });
    });
  });

  describe('Broadcasting', () => {
    it('should broadcast ticket sale updates', async () => {
      const saleUpdate = {
        eventId: 'event-123',
        ticketsSold: 5,
        revenue: 500,
        timestamp: new Date(),
      };

      const broadcastSpy = jest.spyOn(gateway.server, 'to');
      gateway.broadcastTicketSaleUpdate(saleUpdate);

      expect(broadcastSpy).toHaveBeenCalledWith('event-event-123');
    });

    it('should broadcast stats updates', async () => {
      const statsUpdate = {
        eventId: 'event-123',
        totalTickets: 1000,
        soldTickets: 755,
        availableTickets: 245,
        revenue: 75500,
        salesVelocity: 13.2,
        lastUpdated: new Date(),
      };

      const broadcastSpy = jest.spyOn(gateway.server, 'to');
      gateway.broadcastStatsUpdate(statsUpdate);

      expect(broadcastSpy).toHaveBeenCalledWith('event-event-123');
    });
  });
});
