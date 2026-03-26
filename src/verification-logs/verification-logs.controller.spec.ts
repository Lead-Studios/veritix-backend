import { Test, TestingModule } from '@nestjs/testing';
import { VerificationLogsController } from './verification-logs.controller';
import { VerificationLogsService } from './verification-logs.service';

describe('VerificationLogsController', () => {
  let controller: VerificationLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerificationLogsController],
      providers: [VerificationLogsService],
    }).compile();

    controller = module.get<VerificationLogsController>(VerificationLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
