import { Test, TestingModule } from '@nestjs/testing';
import { ConferenceSearchService } from './conference-search.service';

describe('ConferenceSearchService', () => {
  let service: ConferenceSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConferenceSearchService],
    }).compile();

    service = module.get<ConferenceSearchService>(ConferenceSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
