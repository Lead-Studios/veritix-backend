import { Test, TestingModule } from '@nestjs/testing';
import { SpecialSpeakerController } from './special-speaker.controller';
import { SpecialSpeakerService } from './special-speaker.service';

describe('SpecialSpeakerController', () => {
  let controller: SpecialSpeakerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpecialSpeakerController],
      providers: [SpecialSpeakerService],
    }).compile();

    controller = module.get<SpecialSpeakerController>(SpecialSpeakerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
