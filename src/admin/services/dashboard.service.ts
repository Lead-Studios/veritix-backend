import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardService {
  async getAnalytics() {
    return {
      users: 1000,
      tickets: 500,
      revenue: 10000,
    };
  }
} 