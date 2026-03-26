import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule, getQueueToken } from '@nestjs/bull';
import { ComplianceService, COMPLIANCE_QUEUE } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { ComplianceReportProcessor } from './compliance-report.processor';
import { ComplianceReport } from './entities/compliance-report.entity';
import { AuditEvidenceLog } from './entities/audit-evidence-log.entity';

const enableBull = process.env.NODE_ENV !== 'test' && process.env.DISABLE_BULL !== 'true';

const queueProviders = enableBull
  ? []
  : [
      {
        provide: getQueueToken(COMPLIANCE_QUEUE),
        useValue: { add: async () => undefined },
      },
    ];

@Module({
  imports: [
    TypeOrmModule.forFeature([ComplianceReport, AuditEvidenceLog]),
    ...(enableBull ? [BullModule.registerQueue({ name: COMPLIANCE_QUEUE })] : []),
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService, ComplianceReportProcessor, ...queueProviders],
  exports: [ComplianceService],
})
export class ComplianceModule {}
