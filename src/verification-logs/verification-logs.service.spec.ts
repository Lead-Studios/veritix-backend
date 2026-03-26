import { Test, TestingModule } from '@nestjs/testing';
import { VerificationLogsService } from './verification-logs.service';

describe('VerificationLogsService', () => {
  let service: VerificationLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VerificationLogsService],
    }).compile();

    service = module.get<VerificationLogsService>(VerificationLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
