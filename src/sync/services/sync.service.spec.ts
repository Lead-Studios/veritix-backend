import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { SyncJobService } from './sync-job.service';
import { TicketSalesDataService } from './ticket-sales-data.service';
import { WarehouseSyncService } from './warehouse-sync.service';
import { SyncDestination, SyncStatus } from '../schemas/ticket-sales.schema';

describe('SyncService', () => {
  let service: SyncService;
  let syncJobService: jest.Mocked<SyncJobService>;
  let ticketSalesDataService: jest.Mocked<TicketSalesDataService>;
  let warehouseSyncService: jest.Mocked<WarehouseSyncService>;

  beforeEach(async () => {
    const mockSyncJobService = {
      createJob: jest.fn(),
      getJob: jest.fn(),
      getAllJobs: jest.fn(),
      markAsRunning: jest.fn(),
      markAsCompleted: jest.fn(),
      markAsFailed: jest.fn(),
      updateProgress: jest.fn(),
    };

    const mockTicketSalesDataService = {
      getTicketSalesData: jest.fn(),
    };

    const mockWarehouseSyncService = {
      syncToBigQuery: jest.fn(),
      syncToRedshift: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: SyncJobService, useValue: mockSyncJobService },
        { provide: TicketSalesDataService, useValue: mockTicketSalesDataService },
        { provide: WarehouseSyncService, useValue: mockWarehouseSyncService },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    syncJobService = module.get(SyncJobService);
    ticketSalesDataService = module.get(TicketSalesDataService);
    warehouseSyncService = module.get(WarehouseSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiateSync', () => {
    it('should create a sync job and return status', async () => {
      const mockJob = {
        syncId: 'test-sync-id',
        destination: SyncDestination.BIGQUERY,
        status: SyncStatus.PENDING,
        totalRecords: 0,
        processedRecords: 0,
        createdAt: new Date(),
      };

      syncJobService.createJob.mockReturnValue(mockJob as any);

      const result = await service.initiateSync({
        destination: SyncDestination.BIGQUERY,
        batchSize: 1000,
      });

      expect(syncJobService.createJob).toHaveBeenCalledWith(
        SyncDestination.BIGQUERY,
        undefined,
        undefined,
        1000,
      );
      expect(result.syncId).toBe('test-sync-id');
      expect(result.status).toBe(SyncStatus.PENDING);
    });

    it('should handle date parameters correctly', async () => {
      const startDate = '2024-01-01T00:00:00.000Z';
      const endDate = '2024-01-31T23:59:59.999Z';
      const mockJob = {
        syncId: 'test-sync-id',
        destination: SyncDestination.REDSHIFT,
        status: SyncStatus.PENDING,
        totalRecords: 0,
        processedRecords: 0,
        createdAt: new Date(),
      };

      syncJobService.createJob.mockReturnValue(mockJob as any);

      await service.initiateSync({
        destination: SyncDestination.REDSHIFT,
        startDate,
        endDate,
        batchSize: 500,
      });

      expect(syncJobService.createJob).toHaveBeenCalledWith(
        SyncDestination.REDSHIFT,
        new Date(startDate),
        new Date(endDate),
        500,
      );
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status for existing job', async () => {
      const mockJob = {
        syncId: 'test-sync-id',
        destination: SyncDestination.BIGQUERY,
        status: SyncStatus.RUNNING,
        totalRecords: 1000,
        processedRecords: 500,
        createdAt: new Date(),
      };

      syncJobService.getJob.mockReturnValue(mockJob as any);

      const result = await service.getSyncStatus('test-sync-id');

      expect(result.syncId).toBe('test-sync-id');
      expect(result.status).toBe(SyncStatus.RUNNING);
      expect(result.processedRecords).toBe(500);
    });

    it('should throw error for non-existing job', async () => {
      syncJobService.getJob.mockReturnValue(undefined);

      await expect(service.getSyncStatus('non-existing-id')).rejects.toThrow(
        'Sync job non-existing-id not found',
      );
    });
  });

  describe('getAllSyncJobs', () => {
    it('should return all sync jobs', async () => {
      const mockJobs = [
        {
          syncId: 'job-1',
          destination: SyncDestination.BIGQUERY,
          status: SyncStatus.COMPLETED,
          totalRecords: 1000,
          processedRecords: 1000,
          createdAt: new Date(),
        },
        {
          syncId: 'job-2',
          destination: SyncDestination.REDSHIFT,
          status: SyncStatus.RUNNING,
          totalRecords: 2000,
          processedRecords: 1500,
          createdAt: new Date(),
        },
      ];

      syncJobService.getAllJobs.mockReturnValue(mockJobs as any);

      const result = await service.getAllSyncJobs();

      expect(result).toHaveLength(2);
      expect(result[0].syncId).toBe('job-1');
      expect(result[1].syncId).toBe('job-2');
    });
  });
});