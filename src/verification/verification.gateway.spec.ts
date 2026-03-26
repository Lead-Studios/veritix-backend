import { WsException } from '@nestjs/websockets';
import { VerificationGateway } from './verification.gateway';
import { WsJwtGuard } from '../auth/guard/ws-jwt.guard';

describe('VerificationGateway', () => {
  let gateway: VerificationGateway;
  let wsJwtGuard: { authenticateClient: jest.Mock };

  beforeEach(() => {
    wsJwtGuard = {
      authenticateClient: jest.fn(),
    };

    gateway = new VerificationGateway(wsJwtGuard as unknown as WsJwtGuard);
    (gateway as any).server = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('authenticates clients on connection', async () => {
    const client = {
      handshake: {
        query: {
          token: 'jwt-token',
        },
      },
      data: {},
    };

    await gateway.handleConnection(client as any);

    expect(wsJwtGuard.authenticateClient).toHaveBeenCalledWith(client);
  });

  it('joins the event room for join_event', async () => {
    const client = {
      join: jest.fn(),
    };

    const result = await gateway.joinEvent(client as any, {
      eventId: 'event-123',
    });

    expect(client.join).toHaveBeenCalledWith('event:event-123');
    expect(result).toEqual({
      room: 'event:event-123',
      eventId: 'event-123',
    });
  });

  it('throws when join_event is missing eventId', async () => {
    await expect(
      gateway.joinEvent({ join: jest.fn() } as any, {} as any),
    ).rejects.toThrow(WsException);
  });

  it('emits scan_update to the event room', () => {
    const roomEmitter = { emit: jest.fn() };
    (gateway.server.to as jest.Mock).mockReturnValue(roomEmitter);

    gateway.emitScanUpdate({
      eventId: 'event-123',
      totalScanned: 342,
      remaining: 158,
      lastScanAt: '2026-03-25T12:00:00.000Z',
    });

    expect(gateway.server.to).toHaveBeenCalledWith('event:event-123');
    expect(roomEmitter.emit).toHaveBeenCalledWith('scan_update', {
      eventId: 'event-123',
      totalScanned: 342,
      remaining: 158,
      lastScanAt: '2026-03-25T12:00:00.000Z',
    });
  });
});
