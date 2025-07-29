import { Test, TestingModule } from '@nestjs/testing';
import { SyncCronService } from './sync-cron.service';
import { SyncService } from '../services/sync.service';
import { SyncDestination } from '../schemas/ticket-sales.schema';

describe('SyncCronService', () => {
  let service: SyncCronService;
  let syncService: jest.Mocked<SyncService>;

  beforeEach(async () => {
    const mockSyncService = {
      initiateSync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncCronService,
        { provide: SyncService, useValue: mockSyncService },
      ],
    }).compile();

    service = module.get<SyncCronService>(SyncCronService);
    syncService = module.get(SyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('dailyBigQuerySync', () => {
    it('should initiate daily BigQuery sync', async () => {
      syncService.initiateSync.mockResolvedValue({
        syncId: 'daily-bq-sync',
        status: 'pending' as any,
        destination: SyncDestination.BIGQUERY,
        totalRecords: 0,
        processedRecords: 0,
        createdAt: new Date(),
      });

      await service.dailyBigQuerySync();

      expect(syncService.initiateSync).toHaveBeenCalledWith({
        destination: SyncDestination.BIGQUERY,
        startDate: expect.any(String),
        endDate: expect.any(String),
        batchSize: 2000,
      });
    });

    it('should handle sync errors gracefully', async () => {
      const error = new Error('Sync failed');
      syncService.initiateSync.mockRejectedValue(error);

      // Should not throw
      await expect(service.dailyBigQuerySync()).resolves.toBeUndefined();
    });
  });

  describe('dailyRedshiftSync', () => {
    it('should initiate daily Redshift sync', async () => {
      syncService.initiateSync.mockResolvedValue({
        syncId: 'daily-rs-sync',
        status: 'pending' as any,
        destination: SyncDestination.REDSHIFT,
        totalRecords: 0,
        processedRecords: 0,
        createdAt: new Date(),
      });

      await service.dailyRedshiftSync();

      expect(syncService.initiateSync).toHaveBeenCalledWith({
        destination: SyncDestination.REDSHIFT,
        startDate: expect.any(String),
        endDate: expect.any(String),
        batchSize: 1500,
      });
    });
  });

  describe('weeklyFullSync', () => {
    it('should initiate weekly full sync to both warehouses', async () => {
      syncService.initiateSync.mockResolvedValue({
        syncId: 'weekly-sync',
        status: 'pending' as any,
        destination: SyncDestination.BIGQUERY,
        totalRecords: 0,
        processedRecords: 0,
        createdAt: new Date(),
      });

      await service.weeklyFullSync();

      expect(syncService.initiateSync).toHaveBeenCalledTimes(2);
      expect(syncService.initiateSync).toHaveBeenCalledWith({
        destination: SyncDestination.BIGQUERY,
        startDate: expect.any(String),
        batchSize: 5000,
      });
      expect(syncService.initiateSync).toHaveBeenCalledWith({
        destination: SyncDestination.REDSHIFT,
        startDate: expect.any(String),
        batchSize: 5000,
      });
    });
  });
});

