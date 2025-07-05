import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistEntryController } from './waitlist-entry.controller';
import { WaitlistEntryService } from './waitlist-entry.service';

describe('WaitlistEntryController', () => {
  let controller: WaitlistEntryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WaitlistEntryController],
      providers: [WaitlistEntryService],
    }).compile();

    controller = module.get<WaitlistEntryController>(WaitlistEntryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
