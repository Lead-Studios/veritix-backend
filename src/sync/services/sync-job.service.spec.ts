import { Test, TestingModule } from '@nestjs/testing';
import { SyncJobService } from './sync-job.service';
import { SyncDestination, SyncStatus } from '../schemas/ticket-sales.schema';

describe('SyncJobService', () => {
  let service: SyncJobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SyncJobService],
    }).compile();

    service = module.get<SyncJobService>(SyncJobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createJob', () => {
    it('should create a new sync job', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const job = service.createJob(SyncDestination.BIGQUERY, startDate, endDate, 2000);

      expect(job.syncId).toBeDefined();
      expect(job.destination).toBe(SyncDestination.BIGQUERY);
      expect(job.status).toBe(SyncStatus.PENDING);
      expect(job.startDate).toBe(startDate);
      expect(job.endDate).toBe(endDate);
      expect(job.batchSize).toBe(2000);
      expect(job.totalRecords).toBe(0);
      expect(job.processedRecords).toBe(0);
      expect(job.createdAt).toBeInstanceOf(Date);
    });

    it('should create job without dates', () => {
      const job = service.createJob(SyncDestination.REDSHIFT);

      expect(job.destination).toBe(SyncDestination.REDSHIFT);
      expect(job.startDate).toBeUndefined();
      expect(job.endDate).toBeUndefined();
      expect(job.batchSize).toBe(1000); // default value
    });
  });

  describe('updateJob', () => {
    it('should update existing job', () => {
      const job = service.createJob(SyncDestination.BIGQUERY);
      const syncId = job.syncId;

      const updatedJob = service.updateJob(syncId, {
        status: SyncStatus.RUNNING,
        totalRecords: 1000,
        processedRecords: 500,
      });

      expect(updatedJob.status).toBe(SyncStatus.RUNNING);
      expect(updatedJob.totalRecords).toBe(1000);
      expect(updatedJob.processedRecords).toBe(500);
    });

    it('should throw error for non-existing job', () => {
      expect(() => service.updateJob('non-existing', { status: SyncStatus.RUNNING }))
        .toThrow('Sync job non-existing not found');
    });
  });

  describe('markAsRunning', () => {
    it('should mark job as running', () => {
      const job = service.createJob(SyncDestination.BIGQUERY);
      service.markAsRunning(job.syncId);

      const updatedJob = service.getJob(job.syncId);
      expect(updatedJob.status).toBe(SyncStatus.RUNNING);
    });
  });

  describe('markAsCompleted', () => {
    it('should mark job as completed with completion time', () => {
      const job = service.createJob(SyncDestination.BIGQUERY);
      service.markAsCompleted(job.syncId);

      const updatedJob = service.getJob(job.syncId);
      expect(updatedJob.status).toBe(SyncStatus.COMPLETED);
      expect(updatedJob.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('markAsFailed', () => {
    it('should mark job as failed with error message', () => {
      const job = service.createJob(SyncDestination.BIGQUERY);
      const errorMessage = 'Connection timeout';
      
      service.markAsFailed(job.syncId, errorMessage);

      const updatedJob = service.getJob(job.syncId);
      expect(updatedJob.status).toBe(SyncStatus.FAILED);
      expect(updatedJob.errorMessage).toBe(errorMessage);
      expect(updatedJob.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('updateProgress', () => {
    it('should update job progress', () => {
      const job = service.createJob(SyncDestination.BIGQUERY);
      service.updateProgress(job.syncId, 750, 1000);

      const updatedJob = service.getJob(job.syncId);
      expect(updatedJob.processedRecords).toBe(750);
      expect(updatedJob.totalRecords).toBe(1000);
    });
  });
});