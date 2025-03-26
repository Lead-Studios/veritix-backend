import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventGalleryService } from './event-gallery.service';
import { EventGallery } from './entities/event-gallery.entity';
import { Event } from '../events/entities/event.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('EventGalleryService', () => {
  let service: EventGalleryService;
  let galleryRepository: Repository<EventGallery>;
  let eventRepository: Repository<Event>;

  // Mock data
  const mockEvent = {
    id: 'event-1',
    name: 'Test Event',
  };

  const mockGalleryImage = {
    id: 'gallery-1',
    imageUrl: 'test-image.jpg',
    description: 'Test Description',
    eventId: 'event-1',
    event: mockEvent as Event,
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

  describe('createGalleryImage', () => {
    it('should create a gallery image', async () => {
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue(mockEvent as Event);
      jest.spyOn(galleryRepository, 'count').mockResolvedValue(0);
      jest.spyOn(galleryRepository, 'create').mockReturnValue(mockGalleryImage as EventGallery);
      jest.spyOn(galleryRepository, 'save').mockResolvedValue(mockGalleryImage);

      const result = await service.createGalleryImage({
        imageUrl: 'test-image.jpg',
        description: 'Test Description',
        eventId: 'event-1',
      });

      expect(result).toEqual(mockGalleryImage);
    });

    it('should throw NotFoundException if event does not exist', async () => {
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createGalleryImage({
        imageUrl: 'test-image.jpg',
        description: 'Test Description',
        eventId: 'non-existent-event',
      })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if max images limit is reached', async () => {
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue(mockEvent as Event);
      jest.spyOn(galleryRepository, 'count').mockResolvedValue(10);

      await expect(service.createGalleryImage({
        imageUrl: 'test-image.jpg',
        description: 'Test Description',
        eventId: 'event-1',
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAllImages', () => {
    it('should retrieve all images with pagination', async () => {
      const mockImages = [mockGalleryImage];
      jest.spyOn(galleryRepository, 'find').mockResolvedValue(mockImages);

      const result = await service.getAllImages(1, 10);

      expect(result).toEqual(mockImages);
    });
  });

  describe('getImageById', () => {
    it('should retrieve a single image by ID', async () => {
      jest.spyOn(galleryRepository, 'findOne').mockResolvedValue(mockGalleryImage);

      const result = await service.getImageById('gallery-1');

      expect(result).toEqual(mockGalleryImage);
    });

    it('should throw NotFoundException if image does not exist', async () => {
      jest.spyOn(galleryRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getImageById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEventGallery', () => {
    it('should retrieve images for a specific event', async () => {
      const mockImages = [mockGalleryImage];
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue(mockEvent as Event);
      jest.spyOn(galleryRepository, 'find').mockResolvedValue(mockImages);

      const result = await service.getEventGallery('event-1', 1, 10);

      expect(result).toEqual(mockImages);
    });

    it('should throw NotFoundException if event does not exist', async () => {
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getEventGallery('non-existent-event', 1, 10)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateImageDescription', () => {
    it('should update image description', async () => {
      jest.spyOn(service, 'getImageById').mockResolvedValue(mockGalleryImage);
      jest.spyOn(galleryRepository, 'save').mockResolvedValue({
        ...mockGalleryImage,
        description: 'Updated Description',
      });

      const result = await service.updateImageDescription('gallery-1', {
        description: 'Updated Description',
      });

      expect(result.description).toBe('Updated Description');
    });
  });

  describe('deleteImage', () => {
    it('should delete an image', async () => {
      jest.spyOn(galleryRepository, 'delete').mockResolvedValue({ affected: 1 } as any);

      await expect(service.deleteImage('gallery-1')).resolves.not.toThrow();
    });

    it('should throw NotFoundException if image does not exist', async () => {
      jest.spyOn(galleryRepository, 'delete').mockResolvedValue({ affected: 0 } as any);

      await expect(service.deleteImage('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});