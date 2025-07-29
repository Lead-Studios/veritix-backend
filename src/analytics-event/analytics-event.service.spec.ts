import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsEventService } from './analytics-event.service';

describe('AnalyticsEventService', () => {
  let service: AnalyticsEventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsEventService],
    }).compile();

    service = module.get<AnalyticsEventService>(AnalyticsEventService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
