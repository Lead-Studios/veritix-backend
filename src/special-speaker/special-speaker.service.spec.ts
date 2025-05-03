import { Test, TestingModule } from '@nestjs/testing';
import { SpecialSpeakerService } from './special-speaker.service';

describe('SpecialSpeakerService', () => {
  let service: SpecialSpeakerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpecialSpeakerService],
    }).compile();

    service = module.get<SpecialSpeakerService>(SpecialSpeakerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
