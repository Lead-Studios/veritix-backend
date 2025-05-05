import { Test, TestingModule } from "@nestjs/testing";
import { CreateConferenceDto, UpdateConferenceDto } from "../dto";
import {
  Conference,
  ConferenceVisibility,
} from "../entities/conference.entity";
import { ConferenceController } from "./conference.controller";
import { ConferenceService } from "../providers/conference.service";
import { JwtAuthGuard } from "security/guards/jwt-auth.guard";
import { RolesGuard } from "security/guards/rolesGuard/roles.guard";
import { UserRole } from "src/common/enums/users-roles.enum";
import { User } from "src/users/entities/user.entity";
import { Request } from "express";

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
  visibility: ConferenceVisibility.PUBLIC, // Added missing property
  organizer: mockUser,
} as unknown as Conference;

const mockRequest = {
  user: mockUser,
  get: jest.fn(),
  header: jest.fn(),
  accepts: jest.fn(),
  acceptsCharsets: jest.fn(),
  acceptsEncodings: jest.fn(),
  acceptsLanguages: jest.fn(),
  // ... other required Request properties
} as unknown as Request & { user: User };

const mockConferenceService = {
  create: jest.fn().mockResolvedValue(mockConference),
  findAll: jest.fn().mockResolvedValue([mockConference]),
  findOne: jest.fn().mockResolvedValue(mockConference),
  update: jest.fn().mockResolvedValue(mockConference),
  remove: jest.fn().mockResolvedValue(undefined),
  findAllWithFilters: jest.fn().mockResolvedValue({
    data: [mockConference],
    meta: { page: 1, limit: 10, totalCount: 1, totalPages: 1 },
  }),
};

const mockJwtAuthGuard = { canActivate: jest.fn().mockReturnValue(true) };
const mockRolesGuard = { canActivate: jest.fn().mockReturnValue(true) };

describe("ConferenceController", () => {
  let controller: ConferenceController;
  let service: ConferenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConferenceController],
      providers: [
        {
          provide: ConferenceService,
          useValue: mockConferenceService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<ConferenceController>(ConferenceController);
    service = module.get<ConferenceService>(ConferenceService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a conference", async () => {
      const createDto: CreateConferenceDto = {
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

      expect(await controller.create(createDto, mockRequest)).toEqual(
        mockConference,
      );
      expect(service.create).toHaveBeenCalledWith(createDto, mockUser);
    });
  });

  describe("findAll", () => {
    it("should return an array of conferences", async () => {
      expect(await controller.findAll()).toEqual([mockConference]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a single conference", async () => {
      const id = "test-id";
      expect(await controller.findOne(id)).toEqual(mockConference);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe("update", () => {
    it("should update a conference", async () => {
      const id = "test-id";
      const updateDto: UpdateConferenceDto = {
        conferenceName: "Updated Conference",
      };

      expect(await controller.update(id, updateDto)).toEqual(mockConference);
      expect(service.update).toHaveBeenCalledWith(id, updateDto);
    });
  });

  describe("remove", () => {
    it("should remove a conference", async () => {
      const id = "test-id";
      expect(await controller.remove(id)).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
