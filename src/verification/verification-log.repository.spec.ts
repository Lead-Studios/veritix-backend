import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SelectQueryBuilder } from 'typeorm';
import { VerificationLog } from './verification-log.entity';
import { CreateLogDto, VerificationLogRepository } from './verification-log.repository';
import { VerificationStatus } from './interfaces/verification.interface';

const makeLog = (overrides: Partial<VerificationLog> = {}): VerificationLog =>
  ({
    id: 'log-uuid-1',
    ticketId: 'ticket-uuid-1',
    ticketCode: 'TKT-ABC-001',
    eventId: 'event-uuid-1',
    verifierId: 'verifier-uuid-1',
    status: VerificationStatus.SUCCESS,
    message: 'Entry granted',
    attemptedAt: new Date('2024-06-15T10:00:00Z'),
    ...overrides,
  } as VerificationLog);

const makeDto = (overrides: Partial<CreateLogDto> = {}): CreateLogDto => ({
  ticketId: 'ticket-uuid-1',
  ticketCode: 'TKT-ABC-001',
  eventId: 'event-uuid-1',
  verifierId: 'verifier-uuid-1',
  status: VerificationStatus.SUCCESS,
  message: 'Entry granted',
  ...overrides,
});

const makeQb = (result: [VerificationLog[], number] | { status: string; count: string }[]) => {
  const qb: Partial<SelectQueryBuilder<VerificationLog>> = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(result),
    getRawMany: jest.fn().mockResolvedValue(result),
  };
  return qb as SelectQueryBuilder<VerificationLog>;
};

describe('VerificationLogRepository', () => {
  let service: VerificationLogRepository;
  let mockTypeOrmRepo: {
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    mockTypeOrmRepo = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationLogRepository,
        {
          provide: getRepositoryToken(VerificationLog),
          useValue: mockTypeOrmRepo,
        },
      ],
    }).compile();

    service = module.get(VerificationLogRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('persists a successful scan attempt', async () => {
      const dto = makeDto();
      const log = makeLog();
      mockTypeOrmRepo.create.mockReturnValue(log);
      mockTypeOrmRepo.save.mockResolvedValue(log);

      const result = await service.create(dto);

      expect(mockTypeOrmRepo.create).toHaveBeenCalledWith(dto);
      expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(log);
      expect(result.status).toBe(VerificationStatus.SUCCESS);
    });

    it('persists a failed scan with null ticketId', async () => {
      const dto = makeDto({ ticketId: null, status: VerificationStatus.NOT_FOUND, message: 'Ticket not found' });
      const log = makeLog({ ticketId: null, status: VerificationStatus.NOT_FOUND });
      mockTypeOrmRepo.create.mockReturnValue(log);
      mockTypeOrmRepo.save.mockResolvedValue(log);

      const result = await service.create(dto);

      expect(result.ticketId).toBeNull();
      expect(result.status).toBe(VerificationStatus.NOT_FOUND);
    });

    it('persists a scan with null verifierId (anonymous scan)', async () => {
      const dto = makeDto({ verifierId: null });
      const log = makeLog({ verifierId: null });
      mockTypeOrmRepo.create.mockReturnValue(log);
      mockTypeOrmRepo.save.mockResolvedValue(log);

      const result = await service.create(dto);

      expect(result.verifierId).toBeNull();
    });

    it('propagates save errors', async () => {
      mockTypeOrmRepo.create.mockReturnValue(makeLog());
      mockTypeOrmRepo.save.mockRejectedValue(new Error('db error'));

      await expect(service.create(makeDto())).rejects.toThrow('db error');
    });
  });

  describe('getLogsForEvent', () => {
    it('returns logs and total count for an event', async () => {
      const logs = [makeLog(), makeLog({ id: 'log-uuid-2' })];
      const qb = makeQb([logs, 2]);
      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getLogsForEvent('event-uuid-1');

      expect(result.logs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(qb.where).toHaveBeenCalledWith('log.event_id = :eventId', { eventId: 'event-uuid-1' });
    });

    it('applies status filter when provided', async () => {
      const qb = makeQb([[makeLog()], 1]);
      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getLogsForEvent('event-uuid-1', { status: VerificationStatus.ALREADY_USED });

      expect(qb.andWhere).toHaveBeenCalledWith('log.status = :status', {
        status: VerificationStatus.ALREADY_USED,
      });
    });

    it('applies from/to time range filters', async () => {
      const qb = makeQb([[], 0]);
      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qb);

      const from = new Date('2024-06-01T00:00:00Z');
      const to = new Date('2024-06-15T23:59:59Z');

      await service.getLogsForEvent('event-uuid-1', { from, to });

      expect(qb.andWhere).toHaveBeenCalledWith('log.attempted_at >= :from', { from });
      expect(qb.andWhere).toHaveBeenCalledWith('log.attempted_at <= :to', { to });
    });

    it('caps limit at MAX_LIMIT (500)', async () => {
      const qb = makeQb([[], 0]);
      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getLogsForEvent('event-uuid-1', { limit: 9999 });

      expect(qb.take).toHaveBeenCalledWith(500);
    });

    it('defaults limit to 100 when not provided', async () => {
      const qb = makeQb([[], 0]);
      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getLogsForEvent('event-uuid-1');

      expect(qb.take).toHaveBeenCalledWith(100);
    });

    it('applies offset for pagination', async () => {
      const qb = makeQb([[], 0]);
      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getLogsForEvent('event-uuid-1', { offset: 50 });

      expect(qb.skip).toHaveBeenCalledWith(50);
    });

    it('returns empty result when no logs exist', async () => {
      const qb = makeQb([[], 0]);
      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getLogsForEvent('event-uuid-1');

      expect(result.logs).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ----------------------------------------------------------------
  // getLogsForTicket
  // ----------------------------------------------------------------

  describe('getLogsForTicket', () => {
    it('returns logs scoped to a ticket', async () => {
      const logs = [makeLog(), makeLog({ status: VerificationStatus.ALREADY_USED })];
      const qb = makeQb([logs, 2]);
      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getLogsForTicket('ticket-uuid-1');

      expect(result.total).toBe(2);
      expect(qb.where).toHaveBeenCalledWith('log.ticket_id = :ticketId', { ticketId: 'ticket-uuid-1' });
    });

    it('applies status filter', async () => {
      const qb = makeQb([[makeLog({ status: VerificationStatus.ALREADY_USED })], 1]);
      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getLogsForTicket('ticket-uuid-1', { status: VerificationStatus.ALREADY_USED });

      expect(qb.andWhere).toHaveBeenCalledWith('log.status = :status', {
        status: VerificationStatus.ALREADY_USED,
      });
    });
  });

  describe('getStatusCountsForEvent', () => {
    it('returns counts for all statuses, defaulting absent ones to 0', async () => {
      const rawRows = [
        { status: 'success', count: '30' },
        { status: 'not_found', count: '5' },
      ];
      const qb = makeQb(rawRows);
      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qb);

      const counts = await service.getStatusCountsForEvent('event-uuid-1');

      expect(counts[VerificationStatus.SUCCESS]).toBe(30);
      expect(counts[VerificationStatus.NOT_FOUND]).toBe(5);
      // Statuses absent from DB rows default to 0
      expect(counts[VerificationStatus.ALREADY_USED]).toBe(0);
      expect(counts[VerificationStatus.WRONG_EVENT]).toBe(0);
      expect(counts[VerificationStatus.INVALID]).toBe(0);
      expect(counts[VerificationStatus.UNAUTHORIZED]).toBe(0);
      expect(counts[VerificationStatus.ERROR]).toBe(0);
    });

    it('returns all zeros when no attempts exist', async () => {
      const qb = makeQb([]);
      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qb);

      const counts = await service.getStatusCountsForEvent('event-uuid-1');

      for (const status of Object.values(VerificationStatus)) {
        expect(counts[status]).toBe(0);
      }
    });

    it('applies from/to filters to the stats query', async () => {
      const qb = makeQb([]);
      mockTypeOrmRepo.createQueryBuilder.mockReturnValue(qb);

      const from = new Date('2024-06-01T00:00:00Z');
      const to = new Date('2024-06-15T23:59:59Z');

      await service.getStatusCountsForEvent('event-uuid-1', from, to);

      expect(qb.andWhere).toHaveBeenCalledWith('log.attempted_at >= :from', { from });
      expect(qb.andWhere).toHaveBeenCalledWith('log.attempted_at <= :to', { to });
    });
  });
});