import { Test, TestingModule } from '@nestjs/testing';
import { SetllaService } from './setlla.service';

describe('SetllaService', () => {
  let service: SetllaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SetllaService],
    }).compile();

    service = module.get<SetllaService>(SetllaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
