import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { ComplianceService, COMPLIANCE_QUEUE } from './compliance.service';
import { ComplianceReport } from './entities/compliance-report.entity';
import { AuditEvidenceLog } from './entities/audit-evidence-log.entity';
import { ReportType, ExportFormat, ReportStatus } from './enums/report-type.enum';
import { GenerateReportDto } from './dto/generate-report.dto';

const mockReportRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
};

const mockAuditRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

const mockQueue = {
  add: jest.fn(),
};

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue([]),
};

const mockDataSource = {
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

describe('ComplianceService', () => {
  let service: ComplianceService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        { provide: getRepositoryToken(ComplianceReport), useValue: mockReportRepo },
        { provide: getRepositoryToken(AuditEvidenceLog), useValue: mockAuditRepo },
        { provide: getQueueToken(COMPLIANCE_QUEUE), useValue: mockQueue },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
  });

  // -------------------------------------------------------------------------
  // requestReport
  // -------------------------------------------------------------------------
  describe('requestReport', () => {
    it('should create a PENDING report and enqueue a job', async () => {
      const dto: GenerateReportDto = {
        reportType: ReportType.TRANSACTION_SUMMARY,
        exportFormat: ExportFormat.JSON,
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      };

      const created = { id: 'report-uuid', ...dto, status: ReportStatus.PENDING };
      mockReportRepo.create.mockReturnValue(created);
      mockReportRepo.save.mockResolvedValue(created);
      mockQueue.add.mockResolvedValue({});

      const result = await service.requestReport(dto, 'user-uuid');

      expect(mockReportRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ reportType: dto.reportType, status: ReportStatus.PENDING }),
      );
      expect(mockReportRepo.save).toHaveBeenCalledWith(created);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'generate-report',
        { reportId: 'report-uuid' },
        expect.any(Object),
      );
      expect(result.id).toBe('report-uuid');
    });
  });

  // -------------------------------------------------------------------------
  // processReport
  // -------------------------------------------------------------------------
  describe('processReport', () => {
    it('should set status to COMPLETED and compute checksum', async () => {
      const report = {
        id: 'r1',
        reportType: ReportType.TRANSACTION_SUMMARY,
        filters: { dateFrom: '2024-01-01', dateTo: '2024-01-31' },
        status: ReportStatus.PENDING,
      };

      mockReportRepo.findOneOrFail.mockResolvedValue(report);
      mockReportRepo.update.mockResolvedValue({});
      mockQueryBuilder.getRawMany.mockResolvedValue([{ tx_id: '1', tx_amount: '100' }]);

      await service.processReport('r1');

      const updateCalls = mockReportRepo.update.mock.calls;
      const completedCall = updateCalls.find(
        ([, payload]) => payload.status === ReportStatus.COMPLETED,
      );
      expect(completedCall).toBeDefined();
      expect(completedCall[1].checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should mark report as FAILED on error', async () => {
      mockReportRepo.findOneOrFail.mockResolvedValue({
        id: 'r2',
        reportType: 'unknown_type',
        filters: {},
      });
      mockReportRepo.update.mockResolvedValue({});

      await expect(service.processReport('r2')).rejects.toThrow();

      const failedCall = mockReportRepo.update.mock.calls.find(
        ([, p]) => p.status === ReportStatus.FAILED,
      );
      expect(failedCall).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // findReport
  // -------------------------------------------------------------------------
  describe('findReport', () => {
    it('should return a report when found', async () => {
      const report = { id: 'r1' };
      mockReportRepo.findOne.mockResolvedValue(report);
      expect(await service.findReport('r1')).toBe(report);
    });

    it('should throw NotFoundException when not found', async () => {
      mockReportRepo.findOne.mockResolvedValue(null);
      await expect(service.findReport('missing')).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // listReports
  // -------------------------------------------------------------------------
  describe('listReports', () => {
    it('should return reports list', async () => {
      const reports = [{ id: 'r1' }, { id: 'r2' }];
      mockReportRepo.find.mockResolvedValue(reports);
      const result = await service.listReports({});
      expect(result).toHaveLength(2);
    });

    it('should apply reportType filter', async () => {
      mockReportRepo.find.mockResolvedValue([]);
      await service.listReports({ reportType: ReportType.FLAGGED_TRANSACTIONS });
      expect(mockReportRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ reportType: ReportType.FLAGGED_TRANSACTIONS }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // exportReport
  // -------------------------------------------------------------------------
  describe('exportReport', () => {
    const completedReport = {
      id: 'r1',
      status: ReportStatus.COMPLETED,
      exportFormat: ExportFormat.JSON,
      reportType: ReportType.TRANSACTION_SUMMARY,
      reportData: { records: [{ id: '1', amount: '100' }] },
      checksum: 'abc123',
      completedAt: new Date(),
      requestedBy: 'user-1',
      recordCount: 1,
    };

    it('should export as JSON', async () => {
      mockReportRepo.findOne.mockResolvedValue(completedReport);
      const { content, mimeType } = await service.exportReport('r1');
      expect(mimeType).toBe('application/json');
      const parsed = JSON.parse(content);
      expect(parsed.records).toHaveLength(1);
      expect(parsed.meta.checksum).toBe('abc123');
    });

    it('should export as CSV', async () => {
      mockReportRepo.findOne.mockResolvedValue({
        ...completedReport,
        exportFormat: ExportFormat.CSV,
      });
      const { content, mimeType } = await service.exportReport('r1');
      expect(mimeType).toBe('text/csv');
      expect(content).toContain('id,amount');
      expect(content).toContain('"1","100"');
    });

    it('should throw when report is not completed', async () => {
      mockReportRepo.findOne.mockResolvedValue({
        ...completedReport,
        status: ReportStatus.PENDING,
      });
      await expect(service.exportReport('r1')).rejects.toThrow(/not yet completed/);
    });
  });

  // -------------------------------------------------------------------------
  // verifyChecksum
  // -------------------------------------------------------------------------
  describe('verifyChecksum', () => {
    it('should return valid=true when checksum matches', async () => {
      const data = { records: [{ id: '1' }] };
      const checksum = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');

      mockReportRepo.findOne.mockResolvedValue({
        id: 'r1',
        status: ReportStatus.COMPLETED,
        reportData: data,
        checksum,
      });

      const result = await service.verifyChecksum('r1');
      expect(result.valid).toBe(true);
    });

    it('should return valid=false when checksum does not match (tampered)', async () => {
      mockReportRepo.findOne.mockResolvedValue({
        id: 'r1',
        status: ReportStatus.COMPLETED,
        reportData: { records: [{ id: 'tampered' }] },
        checksum: 'wrong-hash',
      });

      const result = await service.verifyChecksum('r1');
      expect(result.valid).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // snapshotAuditEvidence
  // -------------------------------------------------------------------------
  describe('snapshotAuditEvidence', () => {
    it('should create a snapshot with integrity hash', async () => {
      mockAuditRepo.find.mockResolvedValue([{ id: 'log1', action: 'login' }]);
      const snapshot = {
        id: 'snap1',
        integrityHash: 'abc',
        action: 'audit_snapshot',
      };
      mockAuditRepo.create.mockReturnValue(snapshot);
      mockAuditRepo.save.mockResolvedValue(snapshot);

      const result = await service.snapshotAuditEvidence('actor-1', 'compliance_officer', {});

      expect(mockAuditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'audit_snapshot' }),
      );
      expect(result.integrityHash).toBe('abc');
    });
  });

  // -------------------------------------------------------------------------
  // recordAuditEvent
  // -------------------------------------------------------------------------
  describe('recordAuditEvent', () => {
    it('should create audit entry with integrityHash', async () => {
      const entry = { id: 'e1', integrityHash: 'hash123' };
      mockAuditRepo.create.mockReturnValue(entry);
      mockAuditRepo.save.mockResolvedValue(entry);

      const result = await service.recordAuditEvent({
        actorId: 'actor-1',
        actorRole: 'admin',
        action: 'update_user',
        entityType: 'user',
        entityId: 'user-1',
      });

      expect(mockAuditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ integrityHash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
      );
      expect(result).toBe(entry);
    });
  });
});
