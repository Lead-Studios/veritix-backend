import { INestApplication, ValidationPipe, CanActivate, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { VerificationController } from '../src/verification/verification.controller';
import { VerificationService } from '../src/verification/verification.service';
import { JwtAuthGuard } from '../src/auth/guard/jwt.auth.guard';
import { RolesGuard } from '../src/auth/guard/roles.guard';
import { VerificationStatus } from '../src/verification/interfaces/verification.interface';

class AuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: 7,
      role: 'ORGANIZER',
      email: 'organizer@example.com',
      fullName: 'Organizer User',
    };

    return true;
  }
}

describe('VerificationController (e2e)', () => {
  let app: INestApplication<App>;

  const verificationService = {
    verifyTicket: jest.fn(),
    peek: jest.fn(),
    getStatsForEvent: jest.fn(),
    getLogsForEvent: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [VerificationController],
      providers: [
        {
          provide: VerificationService,
          useValue: verificationService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AuthenticatedGuard)
      .overrideGuard(RolesGuard)
      .useClass(AuthenticatedGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /verification/verify returns 200 even for invalid verification', async () => {
    verificationService.verifyTicket.mockResolvedValue({
      status: VerificationStatus.INVALID,
      isValid: false,
      message: 'Invalid ticket. Entry denied.',
      verifiedAt: new Date('2026-03-26T00:00:00.000Z'),
      verifiedBy: '7',
    });

    const response = await request(app.getHttpServer())
      .post('/verification/verify')
      .send({ ticketCode: 'BAD-CODE' })
      .expect(200);

    expect(response.body.isValid).toBe(false);
    expect(verificationService.verifyTicket).toHaveBeenCalledWith({
      ticketCode: 'BAD-CODE',
      eventId: undefined,
      verifierId: '7',
      markAsUsed: false,
    });
  });

  it('POST /verification/check-in always marks the ticket as used', async () => {
    verificationService.verifyTicket.mockResolvedValue({
      status: VerificationStatus.VALID,
      isValid: true,
      message: 'Ticket is valid. Entry permitted.',
      verifiedAt: new Date('2026-03-26T00:00:00.000Z'),
      verifiedBy: 'staff-22',
    });

    await request(app.getHttpServer())
      .post('/verification/check-in')
      .send({ ticketCode: 'TICK-123', verifierId: 'staff-22' })
      .expect(200);

    expect(verificationService.verifyTicket).toHaveBeenCalledWith({
      ticketCode: 'TICK-123',
      verifierId: 'staff-22',
      markAsUsed: true,
    });
  });

  it('GET /verification/peek/:ticketCode is public and does not mark the ticket used', async () => {
    verificationService.peek.mockResolvedValue({
      status: VerificationStatus.VALID,
      isValid: true,
      message: 'Ticket is valid. Entry permitted.',
      verifiedAt: new Date('2026-03-26T00:00:00.000Z'),
    });

    await request(app.getHttpServer())
      .get('/verification/peek/TICK-PEEK')
      .expect(200);

    expect(verificationService.peek).toHaveBeenCalledWith('TICK-PEEK');
  });

  it('GET /verification/stats/:eventId returns event stats for organizer/admin routes', async () => {
    verificationService.getStatsForEvent.mockResolvedValue({
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      totalTickets: 100,
      verifiedCount: 20,
      remainingCount: 80,
      verificationRate: 20,
      calculatedAt: new Date('2026-03-26T00:00:00.000Z'),
    });

    const response = await request(app.getHttpServer())
      .get('/verification/stats/550e8400-e29b-41d4-a716-446655440000')
      .expect(200);

    expect(response.body.totalTickets).toBe(100);
    expect(verificationService.getStatsForEvent).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });

  it('GET /verification/logs/:eventId paginates verification logs', async () => {
    verificationService.getLogsForEvent.mockResolvedValue([
      {
        id: '1',
        ticketCode: 'TICK-1',
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        status: VerificationStatus.VALID,
        verifiedAt: new Date('2026-03-26T00:00:00.000Z'),
      },
      {
        id: '2',
        ticketCode: 'TICK-2',
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        status: VerificationStatus.ALREADY_USED,
        verifiedAt: new Date('2026-03-26T00:05:00.000Z'),
      },
      {
        id: '3',
        ticketCode: 'TICK-3',
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        status: VerificationStatus.CANCELLED,
        verifiedAt: new Date('2026-03-26T00:10:00.000Z'),
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/verification/logs/550e8400-e29b-41d4-a716-446655440000?page=2&limit=1')
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].ticketCode).toBe('TICK-2');
    expect(response.body.meta).toEqual({
      page: 2,
      limit: 1,
      total: 3,
      totalPages: 3,
    });
  });
});
