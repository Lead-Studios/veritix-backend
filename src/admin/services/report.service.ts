import { Injectable } from '@nestjs/common';
import { ReportFilterDto } from '../dtos/report-filter.dto';
import { ReportResource } from '../resources/report.resource';

@Injectable()
export class ReportService {
  async generateReport(filter: ReportFilterDto) {
    const report = {
      period: filter.period || 'all',
      stats: {
        users: 1000,
        events: 100,
        tickets: 500,
        revenue: 10000,
      },
    };
    return ReportResource.toResponse(report);
  }
}
