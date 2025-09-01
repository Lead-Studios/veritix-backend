import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BackgroundSyncService, SyncJobPayload } from './background-sync.service';
import { BackgroundSyncJob, SyncAction, SyncStatus, SyncPriority } from '../entities/background-sync.entity';
import { PWAAnalytics } from '../entities/pwa-analytics.entity';
import { OfflineDataService } from './offline-data.service';

describe('BackgroundSyncService', () => {
  let service: BackgroundSyncService;
  let syncJobRepository: jest.Mocked<Repository<BackgroundSyncJob>>;
  let analyticsRepository: jest.Mocked<Repository<PWAAnalytics>>;
  let offlineDataService: jest.Mocked<OfflineDataService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockSyncJob = {
    id: 'job-123',
    userId: mockUser.id,
    action: SyncAction.TICKET_PURCHASE,
    status: SyncStatus.QUEUED,
    priority: SyncPriority.NORMAL,
    payload: { ticketId: 'ticket-123' },
    maxRetries: 3,
    retryCount: 0,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackgroundSyncService,
        {
          provide: getRepositoryToken(BackgroundSyncJob),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PWAAnalytics),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: OfflineDataService,
          useValue: {
            cacheData: jest.fn(),
            syncData: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BackgroundSyncService>(BackgroundSyncService);
    syncJobRepository = module.get(getRepositoryToken(BackgroundSyncJob));
    analyticsRepository = module.get(getRepositoryToken(PWAAnalytics));
    offlineDataService = module.get(OfflineDataService);
  });

  describe('queueSyncJob', () => {
    it('should queue a sync job successfully', async () => {
      const payload: SyncJobPayload = {
        action: SyncAction.TICKET_PURCHASE,
        data: { ticketId: 'ticket-123' },
        priority: SyncPriority.NORMAL,
      };

      syncJobRepository.create.mockReturnValue(mockSyncJob as any);
      syncJobRepository.save.mockResolvedValue(mockSyncJob as any);

      const result = await service.queueSyncJob(mockUser.id, payload);

      expect(syncJobRepository.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        action: payload.action,
        status: SyncStatus.QUEUED,
        priority: payload.priority,
        payload: payload.data,
        maxRetries: 3,
        metadata: undefined,
      });
      expect(result).toEqual(mockSyncJob);
    });

    it('should set default values for optional parameters', async () => {
      const payload: SyncJobPayload = {
        action: SyncAction.PROFILE_UPDATE,
        data: { name: 'John Doe' },
      };

      syncJobRepository.create.mockReturnValue(mockSyncJob as any);
      syncJobRepository.save.mockResolvedValue(mockSyncJob as any);

      await service.queueSyncJob(mockUser.id, payload);

      expect(syncJobRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: SyncPriority.NORMAL,
          maxRetries: 3,
        })
      );
    });
  });

  describe('processSyncJob', () => {
    it('should process a sync job successfully', async () => {
      const jobWithUser = { ...mockSyncJob, user: mockUser };
      
      syncJobRepository.findOne.mockResolvedValue(jobWithUser as any);
      syncJobRepository.update.mockResolvedValue({} as any);
      analyticsRepository.create.mockReturnValue({} as any);
      analyticsRepository.save.mockResolvedValue({} as any);

      const result = await service.processSyncJob(mockSyncJob.id);

      expect(result.success).toBe(true);
      expect(syncJobRepository.update).toHaveBeenCalledWith(
        mockSyncJob.id,
        expect.objectContaining({
          status: SyncStatus.PROCESSING,
          startedAt: expect.any(Date),
        })
      );
      expect(syncJobRepository.update).toHaveBeenCalledWith(
        mockSyncJob.id,
        expect.objectContaining({
          status: SyncStatus.COMPLETED,
          completedAt: expect.any(Date),
        })
      );
    });

    it('should handle job not found', async () => {
      syncJobRepository.findOne.mockResolvedValue(null);

      const result = await service.processSyncJob('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Job not found');
    });

    it('should prevent duplicate processing', async () => {
      // First call should start processing
      const firstCall = service.processSyncJob(mockSyncJob.id);
      
      // Second call should be rejected
      const secondCall = service.processSyncJob(mockSyncJob.id);
      
      const [firstResult, secondResult] = await Promise.all([firstCall, secondCall]);
      
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toBe('Job already processing');
    });
  });

  describe('getUserSyncJobs', () => {
    it('should get user sync jobs with status filter', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSyncJob]),
      };

      syncJobRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUserSyncJobs(
        mockUser.id,
        SyncStatus.COMPLETED,
        10
      );

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'job.userId = :userId',
        { userId: mockUser.id }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'job.status = :status',
        { status: SyncStatus.COMPLETED }
      );
      expect(result).toEqual([mockSyncJob]);
    });
  });

  describe('getSyncMetrics', () => {
    it('should calculate sync metrics', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        clone: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
      };

      syncJobRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      
      // Mock counts for different statuses
      mockQueryBuilder.getCount
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // completed
        .mockResolvedValueOnce(15)  // failed
        .mockResolvedValueOnce(5);  // pending

      mockQueryBuilder.getRawOne.mockResolvedValue({ avg: '1500' });

      const result = await service.getSyncMetrics(mockUser.id);

      expect(result).toEqual({
        total: 100,
        completed: 80,
        failed: 15,
        pending: 5,
        successRate: 0.8,
        failureRate: 0.15,
        averageProcessingTime: 1500,
      });
    });
  });

  describe('processQueuedJobs', () => {
    it('should process queued jobs', async () => {
      const queuedJobs = [
        { ...mockSyncJob, id: 'job-1' },
        { ...mockSyncJob, id: 'job-2' },
      ];

      syncJobRepository.find.mockResolvedValue(queuedJobs as any);
      syncJobRepository.findOne.mockResolvedValue(mockSyncJob as any);
      syncJobRepository.update.mockResolvedValue({} as any);
      analyticsRepository.create.mockReturnValue({} as any);
      analyticsRepository.save.mockResolvedValue({} as any);

      await service.processQueuedJobs();

      expect(syncJobRepository.find).toHaveBeenCalledWith({
        where: {
          status: expect.any(Object),
          isActive: true,
        },
        order: { priority: 'DESC', createdAt: 'ASC' },
        take: 10,
      });
    });
  });

  describe('retryFailedJobs', () => {
    it('should retry failed jobs within retry limit', async () => {
      const failedJob = {
        ...mockSyncJob,
        status: SyncStatus.FAILED,
        retryCount: 1,
        maxRetries: 3,
      };

      syncJobRepository.find.mockResolvedValue([failedJob] as any);
      syncJobRepository.update.mockResolvedValue({} as any);

      await service.retryFailedJobs();

      expect(syncJobRepository.update).toHaveBeenCalledWith(
        failedJob.id,
        expect.objectContaining({
          status: SyncStatus.RETRYING,
          retryCount: 2,
        })
      );
    });

    it('should deactivate jobs that exceeded retry limit', async () => {
      const exhaustedJob = {
        ...mockSyncJob,
        status: SyncStatus.FAILED,
        retryCount: 3,
        maxRetries: 3,
      };

      syncJobRepository.find.mockResolvedValue([exhaustedJob] as any);
      syncJobRepository.update.mockResolvedValue({} as any);

      await service.retryFailedJobs();

      expect(syncJobRepository.update).toHaveBeenCalledWith(
        exhaustedJob.id,
        { isActive: false }
      );
    });
  });

  describe('cleanupCompletedJobs', () => {
    it('should cleanup old completed jobs', async () => {
      syncJobRepository.delete.mockResolvedValue({} as any);

      await service.cleanupCompletedJobs();

      expect(syncJobRepository.delete).toHaveBeenCalledWith({
        status: SyncStatus.COMPLETED,
        completedAt: expect.any(Object),
      });
    });
  });
});
