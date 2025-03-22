import { Test, TestingModule } from '@nestjs/testing';
import { SpecialGuestController } from './special-guests.controller';
import { SpecialGuestService } from './special-guests.service';

describe('SpecialGuestController', () => {
  let controller: SpecialGuestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpecialGuestController],
      providers: [SpecialGuestService],
    }).compile();

    controller = module.get<SpecialGuestController>(SpecialGuestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
