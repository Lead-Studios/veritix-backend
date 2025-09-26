import { Injectable } from '@nestjs/common';

export interface HealthResponse {
  status: string;
  timestamp?: string;
}

@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}