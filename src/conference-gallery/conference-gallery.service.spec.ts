import { Test, TestingModule } from '@nestjs/testing';
import { ConferenceGalleryService } from './conference-gallery.service';

describe('ConferenceGalleryService', () => {
  let service: ConferenceGalleryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConferenceGalleryService],
    }).compile();

    service = module.get<ConferenceGalleryService>(ConferenceGalleryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
