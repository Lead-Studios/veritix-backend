import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsEventController } from './analytics-event.controller';
import { AnalyticsEventService } from './analytics-event.service';

describe('AnalyticsEventController', () => {
  let controller: AnalyticsEventController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsEventController],
      providers: [AnalyticsEventService],
    }).compile();

    controller = module.get<AnalyticsEventController>(AnalyticsEventController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
