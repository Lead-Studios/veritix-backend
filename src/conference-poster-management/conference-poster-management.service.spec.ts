import { Test, TestingModule } from '@nestjs/testing';
import { ConferencePosterManagementService } from './conference-poster-management.service';

describe('ConferencePosterManagementService', () => {
  let service: ConferencePosterManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConferencePosterManagementService],
    }).compile();

    service = module.get<ConferencePosterManagementService>(ConferencePosterManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
