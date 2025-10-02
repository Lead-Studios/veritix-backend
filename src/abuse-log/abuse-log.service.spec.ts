import { Test, TestingModule } from '@nestjs/testing';
import { AbuseLogService } from './abuse-log.service';

describe('AbuseLogService', () => {
  let service: AbuseLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AbuseLogService],
    }).compile();

    service = module.get<AbuseLogService>(AbuseLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
