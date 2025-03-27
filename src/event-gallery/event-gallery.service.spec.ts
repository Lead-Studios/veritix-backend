import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventGalleryService } from "./event-gallery.service";
import { EventGallery } from "./entities/event-gallery.entity";
import { Event } from "../events/entities/event.entity";
import { NotFoundException, BadRequestException } from "@nestjs/common";

describe("EventGalleryService", () => {
  let service: EventGalleryService;
  let galleryRepository: Repository<EventGallery>;
  let eventRepository: Repository<Event>;

  const mockEvent = {
    id: "event-1",
    eventName: "Test Event",
    eventCategory: "Conference",
    eventDate: new Date(),
    eventClosingDate: new Date(),
    eventDescription: "Test Event Description",
    country: "Test Country",
    state: "Test State",
    street: "Test Street",
    localGovernment: "Test Local Government",
    direction: "Test Direction",
    eventImage: "test-image.jpg",
    hideEventLocation: false,
    eventComingSoon: false,
    transactionCharge: false,
    bankName: null,
    bankAccountNumber: null,
    accountName: null,
    facebook: null,
    twitter: null,
    instagram: null,
    sponsors: [],
    tickets: [],
    specialGuests: null,
    collaborators: [],
    isArchived: false,
    deletedAt: undefined,
    posters: [],
    eventGallery: [],
  } as Event;

  const mockGalleryImage = {
    id: "gallery-1",
    imageUrl: "test-image.jpg",
    description: "Test Description",
    eventId: "event-1",
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
    galleryRepository = module.get<Repository<EventGallery>>(
      getRepositoryToken(EventGallery),
    );
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));
  });
  describe("deleteImage", () => {
    it("should delete an image", async () => {
      jest
        .spyOn(galleryRepository, "delete")
        .mockResolvedValue({ affected: 1 } as any);

      await expect(service.deleteImage("gallery-1")).resolves.not.toThrow();
    });

    it("should throw NotFoundException if image does not exist", async () => {
      jest
        .spyOn(galleryRepository, "delete")
        .mockResolvedValue({ affected: 0 } as any);

      await expect(service.deleteImage("non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
