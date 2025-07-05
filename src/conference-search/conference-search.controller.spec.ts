import { Test, TestingModule } from '@nestjs/testing';
import { ConferenceSearchController } from './conference-search.controller';
import { ConferenceSearchService } from './conference-search.service';

describe('ConferenceSearchController', () => {
  let controller: ConferenceSearchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConferenceSearchController],
      providers: [ConferenceSearchService],
    }).compile();

    controller = module.get<ConferenceSearchController>(ConferenceSearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
