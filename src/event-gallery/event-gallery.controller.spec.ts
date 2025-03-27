import { Test, TestingModule } from '@nestjs/testing';
import { EventGalleryService } from './event-gallery.service';
import { EventGalleryController } from './event-gallery.controller';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventGallery } from './entities/event-gallery.entity';
import { Event } from '../events/entities/event.entity';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('EventGalleryService', () => {
  let service: EventGalleryService;
  let eventRepository: Repository<Event>;
  let galleryRepository: Repository<EventGallery>;

  const mockEvent = {
    id: 'event-uuid',
    name: 'Test Event',
  };

  const mockGalleryImage = {
    id: 'gallery-uuid',
    imageUrl: 'test-image.jpg',
    description: 'Test Description',
    eventId: 'event-uuid',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventGalleryService,
        {
          provide: getRepositoryToken(EventGallery),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Event),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<EventGalleryService>(EventGalleryService);
    galleryRepository = module.get<Repository<EventGallery>>(getRepositoryToken(EventGallery));
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));
  });

  it('should create a gallery image', async () => {
    jest.spyOn(eventRepository, 'findOne').mockResolvedValue(mockEvent as any);
    jest.spyOn(galleryRepository, 'count').mockResolvedValue(0);
    jest.spyOn(galleryRepository, 'create').mockReturnValue(mockGalleryImage as any);
    jest.spyOn(galleryRepository, 'save').mockResolvedValue(mockGalleryImage as any);

    const result = await service.createGalleryImage({
      imageUrl: 'test-image.jpg',
      description: 'Test Description',
      eventId: 'event-uuid',
    });

    expect(result).toEqual(mockGalleryImage);
  });

  it('should prevent creating more than 10 images for an event', async () => {
    jest.spyOn(eventRepository, 'findOne').mockResolvedValue(mockEvent as any);
    jest.spyOn(galleryRepository, 'count').mockResolvedValue(10);

    await expect(service.createGalleryImage({
      imageUrl: 'test-image.jpg',
      description: 'Test Description',
      eventId: 'event-uuid',
    })).rejects.toThrow(BadRequestException);
  });

  it('should retrieve an image by id', async () => {
    jest.spyOn(galleryRepository, 'findOne').mockResolvedValue(mockGalleryImage as any);

    const result = await service.getImageById('gallery-uuid');
    expect(result).toEqual(mockGalleryImage);
  });

  it('should throw error when image not found', async () => {
    jest.spyOn(galleryRepository, 'findOne').mockResolvedValue(null);

    await expect(service.getImageById('non-existent-uuid'))
      .rejects.toThrow(NotFoundException);
  });

  it('should delete an image', async () => {
    jest.spyOn(galleryRepository, 'delete').mockResolvedValue({ affected: 1 } as any);

    await service.deleteImage('gallery-uuid');
    // No exception means successful deletion
  });

  it('should throw error when deleting non-existent image', async () => {
    jest.spyOn(galleryRepository, 'delete').mockResolvedValue({ affected: 0 } as any);

    await expect(service.deleteImage('non-existent-uuid'))
      .rejects.toThrow(NotFoundException);
  });
});

describe('EventGalleryController', () => {
  let controller: EventGalleryController;
  let service: EventGalleryService;

  const mockGalleryImage = {
    id: 'gallery-uuid',
    imageUrl: 'test-image.jpg',
    description: 'Test Description',
    eventId: 'event-uuid',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventGalleryController],
      providers: [
        {
          provide: EventGalleryService,
          useValue: {
            createGalleryImage: jest.fn(),
            getAllImages: jest.fn(),
            getImageById: jest.fn(),
            getEventGallery: jest.fn(),
            updateImageDescription: jest.fn(),
            deleteImage: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EventGalleryController>(EventGalleryController);
    service = module.get<EventGalleryService>(EventGalleryService);
  });

  it('should create a gallery image', async () => {
    const mockFile = {
      filename: 'test-image.jpg',
      path: 'upload/event-gallery/test-image.jpg',
    } as Express.Multer.File;

    jest.spyOn(service, 'createGalleryImage').mockResolvedValue(mockGalleryImage as any);

    const result = await controller.createGalleryImage(mockFile, {
      imageUrl: 'upload/event-gallery/test-image.jpg',
      description: 'Test Description',
      eventId: 'event-uuid',
    });

    expect(result).toEqual(mockGalleryImage);
  });
});