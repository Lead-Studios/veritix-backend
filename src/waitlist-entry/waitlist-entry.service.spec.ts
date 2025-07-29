import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistEntryService } from './waitlist-entry.service';

describe('WaitlistEntryService', () => {
  let service: WaitlistEntryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WaitlistEntryService],
    }).compile();

    service = module.get<WaitlistEntryService>(WaitlistEntryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
