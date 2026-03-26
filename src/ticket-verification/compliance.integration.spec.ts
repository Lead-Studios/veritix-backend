import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ComplianceModule } from './compliance.module';
import { ComplianceReport } from './entities/compliance-report.entity';
import { AuditEvidenceLog } from './entities/audit-evidence-log.entity';
import { ReportType, ExportFormat, ReportStatus } from './enums/report-type.enum';
import { ComplianceService } from './compliance.service';
import { ComplianceGuard } from './guards/compliance.guard';

/**
 * Integration test suite for the Compliance module.
 *
 * Uses an in-memory SQLite DB (or swapped out for a test PG) and mocks
 * the BullMQ queue so no Redis is needed during CI runs.
 */

const mockQueue = { add: jest.fn().mockResolvedValue({}) };
const mockComplianceGuard = { canActivate: jest.fn().mockReturnValue(true) };

describe('Compliance Module (integration)', () => {
  let app: INestApplication;
  let complianceService: ComplianceService;

  const reportBase = {
    id: 'test-report-id',
    reportType: ReportType.TRANSACTION_SUMMARY,
    exportFormat: ExportFormat.JSON,
    status: ReportStatus.PENDING,
    requestedBy: 'user-1',
    filters: {},
    checksum: null,
    reportData: null,
    recordCount: null,
    errorMessage: null,
    exportPath: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    requestReport: jest.fn().mockResolvedValue(reportBase),
    listReports: jest.fn().mockResolvedValue([reportBase]),
    findReport: jest.fn().mockResolvedValue(reportBase),
    exportReport: jest.fn().mockResolvedValue({
      content: JSON.stringify({ meta: {}, records: [] }),
      mimeType: 'application/json',
      filename: 'compliance-transaction_summary-test-report-id.json',
    }),
    verifyChecksum: jest.fn().mockResolvedValue({ valid: true, expected: 'abc', actual: 'abc' }),
    snapshotAuditEvidence: jest.fn().mockResolvedValue({ id: 'snap1', integrityHash: 'hash' }),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ComplianceModule],
    })
      .overrideProvider(ComplianceService)
      .useValue(mockService)
      .overrideGuard(ComplianceGuard)
      .useValue(mockComplianceGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    complianceService = module.get<ComplianceService>(ComplianceService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // POST /admin/compliance/report
  // -------------------------------------------------------------------------
  describe('POST /admin/compliance/report', () => {
    it('should return 202 and queued report on valid payload', async () => {
      const dto = {
        reportType: ReportType.TRANSACTION_SUMMARY,
        exportFormat: ExportFormat.JSON,
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      };

      const res = await request(app.getHttpServer())
        .post('/admin/compliance/report')
        .send(dto)
        .expect(202);

      expect(res.body.id).toBe('test-report-id');
      expect(res.body.status).toBe(ReportStatus.PENDING);
    });

    it('should return 400 on invalid reportType', async () => {
      await request(app.getHttpServer())
        .post('/admin/compliance/report')
        .send({ reportType: 'INVALID', exportFormat: ExportFormat.JSON })
        .expect(400);
    });

    it('should return 400 when exportFormat is missing', async () => {
      await request(app.getHttpServer())
        .post('/admin/compliance/report')
        .send({ reportType: ReportType.FLAGGED_TRANSACTIONS })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET /admin/compliance/report
  // -------------------------------------------------------------------------
  describe('GET /admin/compliance/report', () => {
    it('should return an array of reports', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/compliance/report')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].id).toBe('test-report-id');
    });

    it('should forward reportType query param', async () => {
      await request(app.getHttpServer())
        .get('/admin/compliance/report')
        .query({ reportType: ReportType.USER_ACTIVITY })
        .expect(200);

      expect(mockService.listReports).toHaveBeenCalledWith(
        expect.objectContaining({ reportType: ReportType.USER_ACTIVITY }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // GET /admin/compliance/report/:id
  // -------------------------------------------------------------------------
  describe('GET /admin/compliance/report/:id', () => {
    it('should return the report', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/compliance/report/test-report-id')
        .expect(200);

      expect(res.body.id).toBe('test-report-id');
    });
  });

  // -------------------------------------------------------------------------
  // GET /admin/compliance/report/:id/export
  // -------------------------------------------------------------------------
  describe('GET /admin/compliance/report/:id/export', () => {
    it('should return JSON file download', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/compliance/report/test-report-id/export')
        .expect(200);

      expect(res.headers['content-type']).toContain('application/json');
      expect(res.headers['content-disposition']).toContain('attachment');
    });

    it('should return CSV when report format is CSV', async () => {
      mockService.exportReport.mockResolvedValueOnce({
        content: 'id,amount\n"1","100"',
        mimeType: 'text/csv',
        filename: 'compliance-transaction_summary-test.csv',
      });

      const res = await request(app.getHttpServer())
        .get('/admin/compliance/report/test-report-id/export')
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
    });
  });

  // -------------------------------------------------------------------------
  // GET /admin/compliance/report/:id/verify
  // -------------------------------------------------------------------------
  describe('GET /admin/compliance/report/:id/verify', () => {
    it('should return checksum verification result', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/compliance/report/test-report-id/verify')
        .expect(200);

      expect(res.body.valid).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // POST /admin/compliance/audit-snapshot
  // -------------------------------------------------------------------------
  describe('POST /admin/compliance/audit-snapshot', () => {
    it('should return the new audit snapshot', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/compliance/audit-snapshot')
        .expect(201);

      expect(res.body.id).toBe('snap1');
      expect(res.body.integrityHash).toBe('hash');
    });
  });

  // -------------------------------------------------------------------------
  // Role enforcement
  // -------------------------------------------------------------------------
  describe('Role enforcement', () => {
    it('should reject non-compliance roles with 403', async () => {
      mockComplianceGuard.canActivate.mockReturnValueOnce(false);

      // When guard returns false NestJS sends 403
      await request(app.getHttpServer())
        .get('/admin/compliance/report')
        .expect(403);
    });
  });
});
