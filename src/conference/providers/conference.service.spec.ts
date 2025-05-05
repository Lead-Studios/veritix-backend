import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Conference,
  ConferenceVisibility,
} from "../entities/conference.entity";
import { NotFoundException } from "@nestjs/common";
import { ConferenceService } from "./conference.service";
import { UpdateConferenceDto } from "../dto";
import { UserRole } from "src/common/enums/users-roles.enum";
import { User } from "src/users/entities/user.entity";

const mockConference = {
  id: "test-id",
  conferenceName: "Test Conference",
  conferenceCategory: "Technology",
  conferenceDate: new Date(),
  conferenceClosingDate: new Date(),
  conferenceDescription: "A test conference",
  conferenceImage: "https://example.com/image.jpg",
  country: "Nigeria",
  state: "Lagos",
  street: "123 Main St",
  localGovernment: "Ikeja",
  direction: "Near the mall",
  hideLocation: false,
  comingSoon: false,
  transactionCharge: false,
  bankName: "Test Bank",
  bankAccountNumber: "1234567890",
  accountName: "Test Account",
  facebook: "facebook.com/test",
  twitter: "twitter.com/test",
  instagram: "instagram.com/test",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRepository = {
  create: jest.fn().mockReturnValue(mockConference),
  save: jest.fn().mockResolvedValue(mockConference),
  find: jest.fn().mockResolvedValue([mockConference]),
  findOne: jest.fn(),
  remove: jest.fn().mockResolvedValue(undefined),
};

describe("ConferenceService", () => {
  let service: ConferenceService;
  let repository: Repository<Conference>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConferenceService,
        {
          provide: getRepositoryToken(Conference),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ConferenceService>(ConferenceService);
    repository = module.get<Repository<Conference>>(
      getRepositoryToken(Conference),
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a new conference", async () => {
      const mockUser: User = {
        id: "user-1",
        email: "test@example.com",
        password: "hashedPassword",
        firstName: "Test",
        lastName: "User",
        role: UserRole.Organizer,
        conferences: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as User;

      const createDto = {
        conferenceName: "Test Conference",
        conferenceCategory: "Technology",
        conferenceDate: new Date(),
        conferenceClosingDate: new Date(),
        conferenceDescription: "A test conference",
        conferenceImage: "https://example.com/image.jpg",
        visibility: ConferenceVisibility.PUBLIC,
        location: {
          country: "Nigeria",
          state: "Lagos",
          street: "123 Main St",
          localGovernment: "Ikeja",
          direction: "Near the mall",
        },
        bankDetails: {
          bankName: "Test Bank",
          bankAccountNumber: "1234567890",
          accountName: "Test Account",
        },
        socialMedia: {
          facebook: "facebook.com/test",
          twitter: "twitter.com/test",
          instagram: "instagram.com/test",
        },
      };

      expect(await service.create(createDto, mockUser)).toEqual(mockConference);
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("should return an array of conferences", async () => {
      expect(await service.findAll()).toEqual([mockConference]);
      expect(repository.find).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a single conference", async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockConference);
      expect(await service.findOne("test-id")).toEqual(mockConference);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: "test-id" },
      });
    });

    it("should throw NotFoundException if conference not found", async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);
      await expect(service.findOne("non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update a conference", async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockConference);

      const updateDto: UpdateConferenceDto = {
        conferenceName: "Updated Conference",
        location: {
          country: "Updated Country",
          state: "Lagos",
          street: "123 Main St",
          localGovernment: "Ikeja",
          direction: "Near the mall",
        },
        bankDetails: {
          bankName: "Updated Bank",
          bankAccountNumber: "1234567890",
          accountName: "Test Account",
        },
      };

      expect(await service.update("test-id", updateDto)).toEqual(
        mockConference,
      );
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("should delete a conference", async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockConference);
      await service.remove("test-id");
      expect(repository.remove).toHaveBeenCalledWith(mockConference);
    });
  });
});
