import { Test, TestingModule } from '@nestjs/testing';
import { ConferenceGalleryController } from './conference-gallery.controller';

describe('ConferenceGalleryController', () => {
  let controller: ConferenceGalleryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConferenceGalleryController],
    }).compile();

    controller = module.get<ConferenceGalleryController>(ConferenceGalleryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
