import { Test, TestingModule } from '@nestjs/testing';
import { SyncController } from './sync.controller';
import { SyncService } from '../services/sync.service';
import { SyncDestination, SyncStatus } from '../schemas/ticket-sales.schema';
import { InitiateSyncDto } from '../dto/ticket-sales-sync.dto';

describe('SyncController', () => {
  let controller: SyncController;
  let syncService: jest.Mocked<SyncService>;

  beforeEach(async () => {
    const mockSyncService = {
      initiateSync: jest.fn(),
      getSyncStatus: jest.fn(),
      getAllSyncJobs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [{ provide: SyncService, useValue: mockSyncService }],
    }).compile();

    controller = module.get<SyncController>(SyncController);
    syncService = module.get(SyncService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('initiateSync', () => {
    it('should initiate sync and return status', async () => {
      const initiateSyncDto: InitiateSyncDto = {
        destination: SyncDestination.BIGQUERY,
        batchSize: 1000,
      };

      const expectedResponse = {
        syncId: 'test-sync-id',
        status: SyncStatus.PENDING,
        destination: SyncDestination.BIGQUERY,
        totalRecords: 0,
        processedRecords: 0,
        createdAt: new Date(),
      };

      syncService.initiateSync.mockResolvedValue(expectedResponse);

      const result = await controller.initiateSync(initiateSyncDto);

      expect(syncService.initiateSync).toHaveBeenCalledWith(initiateSyncDto);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle sync initiation with date range', async () => {
      const initiateSyncDto: InitiateSyncDto = {
        destination: SyncDestination.REDSHIFT,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z',
        batchSize: 2000,
      };

      const expectedResponse = {
        syncId: 'test-sync-id-2',
        status: SyncStatus.PENDING,
        destination: SyncDestination.REDSHIFT,
        totalRecords: 0,
        processedRecords: 0,
        createdAt: new Date(),
      };

      syncService.initiateSync.mockResolvedValue(expectedResponse);

      const result = await controller.initiateSync(initiateSyncDto);

      expect(syncService.initiateSync).toHaveBeenCalledWith(initiateSyncDto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status', async () => {
      const syncId = 'test-sync-id';
      const expectedResponse = {
        syncId,
        status: SyncStatus.RUNNING,
        destination: SyncDestination.BIGQUERY,
        totalRecords: 1000,
        processedRecords: 500,
        createdAt: new Date(),
      };

      syncService.getSyncStatus.mockResolvedValue(expectedResponse);

      const result = await controller.getSyncStatus(syncId);

      expect(syncService.getSyncStatus).toHaveBeenCalledWith(syncId);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getAllSyncJobs', () => {
    it('should return all sync jobs', async () => {
      const expectedResponse = [
        {
          syncId: 'job-1',
          status: SyncStatus.COMPLETED,
          destination: SyncDestination.BIGQUERY,
          totalRecords: 1000,
          processedRecords: 1000,
          createdAt: new Date(),
        },
        {
          syncId: 'job-2',
          status: SyncStatus.RUNNING,
          destination: SyncDestination.REDSHIFT,
          totalRecords: 2000,
          processedRecords: 1500,
          createdAt: new Date(),
        },
      ];

      syncService.getAllSyncJobs.mockResolvedValue(expectedResponse);

      const result = await controller.getAllSyncJobs();

      expect(syncService.getAllSyncJobs).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });
  });
});
