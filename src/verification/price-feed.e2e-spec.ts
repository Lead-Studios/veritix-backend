import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { ExecutionContext } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsModule } from '../src/web-sockets/notifications.module';
import { PriceFeedGateway } from '../src/web-sockets/gateways/price-feed.gateway';
import { PositionFeedGateway } from '../src/web-sockets/gateways/position-feed.gateway';
import { MarketDataService } from '../src/web-sockets/services/market-data.service';
import { FxAggregatorService } from '../src/modules/fx/fx-aggregator.service';
import { PersistedNotification } from '../src/web-sockets/persisted-notification.entity';
import {
  MARKET_EVENTS,
  POSITION_SIGNIFICANT_CHANGE_EVENT,
} from '../src/web-sockets/market-feed.constants';
import { WsJwtGuard } from '../src/web-sockets/ws-jwt.guard';

describe('Price Feed WebSocket Integration', () => {
  let moduleRef: TestingModule;
  let jwtService: JwtService;
  let eventEmitter: EventEmitter2;
  let priceGateway: PriceFeedGateway;
  let positionGateway: PositionFeedGateway;
  let marketDataService: MarketDataService;
  let fxAggregatorService: FxAggregatorService;
  let wsJwtGuard: WsJwtGuard;

  const sockets = new Map<string, any>();
  const serverMock = {
    to: jest.fn((socketId: string) => ({
      emit: jest.fn((event: string, payload: any) => {
        sockets.get(socketId)?.receive(event, payload);
      }),
    })),
  };

  const persistedNotificationRepoMock = {
    create: jest.fn((dto) => ({ ...dto, id: 'persisted-1', createdAt: new Date() })),
    save: jest.fn(async (entity) => entity),
    find: jest.fn(async () => []),
    update: jest.fn(async () => ({ affected: 1 })),
    delete: jest.fn(async () => ({ affected: 0 })),
    increment: jest.fn(async () => undefined),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'market-test-secret';

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        JwtModule.register({ secret: 'market-test-secret', global: true }),
        EventEmitterModule.forRoot(),
        NotificationsModule,
      ],
    })
      .overrideProvider(getRepositoryToken(PersistedNotification))
      .useValue(persistedNotificationRepoMock)
      .compile();

    jwtService = moduleRef.get(JwtService);
    eventEmitter = moduleRef.get(EventEmitter2);
    priceGateway = moduleRef.get(PriceFeedGateway);
    positionGateway = moduleRef.get(PositionFeedGateway);
    marketDataService = moduleRef.get(MarketDataService);
    fxAggregatorService = moduleRef.get(FxAggregatorService);
    wsJwtGuard = moduleRef.get(WsJwtGuard);

    priceGateway.server = serverMock as any;
    positionGateway.server = serverMock as any;

    jest.spyOn(fxAggregatorService, 'getValidatedRate').mockImplementation(async (pair: string) => {
      const rates: Record<string, number> = {
        'EUR/USD': 1.0867,
        'GBP/USD': 1.2744,
        'USD/JPY': 151.38,
      };
      return rates[pair.toUpperCase()] ?? 1.1111;
    });
  });

  beforeEach(() => {
    sockets.clear();
    serverMock.to.mockClear();
    marketDataService.clearAllSubscriptions();
    positionGateway.resetSubscriptions();
  });

  it('broadcasts live prices for subscribed pairs', async () => {
    const socket = makeSocket('price-socket');

    const ack = await priceGateway.subscribe(socket as any, {
      pairs: ['EUR/USD'],
      intervalMs: 1000,
    });
    expect(ack.success).toBe(true);

    await priceGateway.broadcastDuePrices();

    expect(socket.events[MARKET_EVENTS.PRICE_UPDATE]).toHaveLength(1);
    const payload = socket.events[MARKET_EVENTS.PRICE_UPDATE][0];
    expect(payload.pair).toBe('EUR/USD');
    expect(payload.orderBook.bids).toHaveLength(5);
    expect(payload.orderBook.asks).toHaveLength(5);
  });

  it('throttles updates faster than minInterval', async () => {
    const socket = makeSocket('throttle-socket');

    await priceGateway.subscribe(socket as any, {
      pairs: ['GBP/USD'],
      intervalMs: 100,
      minIntervalMs: 500,
    });

    await priceGateway.broadcastDuePrices();
    await priceGateway.broadcastDuePrices();
    await new Promise((resolve) => setTimeout(resolve, 550));
    await priceGateway.broadcastDuePrices();

    expect(socket.events[MARKET_EVENTS.PRICE_UPDATE]).toHaveLength(2);
  });

  it('requires authentication for position subscriptions and emits significant changes', async () => {
    const unauthorizedSocket = makeSocket('unauthorized-socket');

    await expect(
      wsJwtGuard.canActivate(makeWsContext(unauthorizedSocket) as ExecutionContext),
    ).rejects.toThrow('Missing authentication token');

    const authorizedSocket = makeSocket(
      'authorized-socket',
      jwtService.sign(
        { sub: 'user-1', email: 'user@nexafx.test', roles: ['user'] },
        { secret: 'market-test-secret' },
      ),
    );

    const canActivate = await wsJwtGuard.canActivate(
      makeWsContext(authorizedSocket) as ExecutionContext,
    );
    expect(canActivate).toBe(true);

    const ack = await positionGateway.subscribe(authorizedSocket as any, {
      minIntervalMs: 200,
    });
    expect(ack.success).toBe(true);

    positionGateway.handleSignificantPositionChange({
      userId: 'user-1',
      totalExposure: 1200,
      previousTotalExposure: 1000,
      changeRatio: 0.2,
      positions: [
        {
          id: 'pos-1',
          symbol: 'EURUSD',
          quantity: 1000,
          entryPrice: 1.1,
          currentPrice: 1.2,
          leverage: 10,
          side: 'BUY',
          assetType: 'FOREX',
        },
      ],
      timestamp: new Date().toISOString(),
    });

    expect(authorizedSocket.events[MARKET_EVENTS.POSITION_UPDATE]).toHaveLength(1);
    expect(authorizedSocket.events[MARKET_EVENTS.POSITION_UPDATE][0].changeRatio).toBeGreaterThan(
      0.01,
    );
  });

  it('cleans up disconnect state', async () => {
    const socket = makeSocket(
      'cleanup-socket',
      jwtService.sign(
        { sub: 'user-2', email: 'cleanup@nexafx.test', roles: ['user'] },
        { secret: 'market-test-secret' },
      ),
    );

    await wsJwtGuard.canActivate(makeWsContext(socket) as ExecutionContext);
    await priceGateway.subscribe(socket as any, { pairs: ['USD/JPY'] });
    await positionGateway.subscribe(socket as any, {});

    expect(priceGateway.getActiveSubscriptionCount()).toBeGreaterThan(0);
    expect(positionGateway.getActiveSubscriptionCount()).toBeGreaterThan(0);

    priceGateway.handleDisconnect(socket as any);
    positionGateway.handleDisconnect(socket as any);

    expect(priceGateway.getActiveSubscriptionCount()).toBe(0);
    expect(positionGateway.getActiveSubscriptionCount()).toBe(0);
    expect(marketDataService.getSubscriptionCount()).toBe(0);
  });

  function makeSocket(socketId: string, token?: string) {
    const socket = {
      id: socketId,
      handshake: {
        headers: token ? { authorization: `Bearer ${token}` } : {},
        auth: token ? { token: `Bearer ${token}` } : {},
        query: {},
      },
      user: undefined,
      events: {} as Record<string, any[]>,
      receive(event: string, payload: any) {
        this.events[event] = this.events[event] ?? [];
        this.events[event].push(payload);
      },
    };

    sockets.set(socketId, socket);
    return socket;
  }

  function makeWsContext(socket: any) {
    return {
      switchToWs: () => ({
        getClient: () => socket,
        getData: () => ({}),
      }),
    };
  }
});
