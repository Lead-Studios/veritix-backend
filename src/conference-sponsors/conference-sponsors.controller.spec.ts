import { Test, TestingModule } from "@nestjs/testing";
import { ConferenceSponsorsController } from "./conference-sponsors.controller";
import { ConferenceSponsorsService } from "./conference-sponsors.service";
import {
  CreateConferenceSponsorDto,
  ConferenceSponsorResponseDto,
} from "./dto/create-conference-sponsor.dto";
import { UpdateConferenceSponsorDto } from "./dto/update-conference-sponsor.dto";
import { UserRole } from "../../src/common/enums/users-roles.enum";
import { HttpException, HttpStatus } from "@nestjs/common";

describe("ConferenceSponsorsController", () => {
  let controller: ConferenceSponsorsController;
  let service: ConferenceSponsorsService;

  const mockFile = {
    fieldname: "brandImage",
    originalname: "test.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    buffer: Buffer.from("test"),
    size: 955578,
    filename: "test-123456.jpg",
    path: "uploads/conference-sponsors/test-123456.jpg",
  } as Express.Multer.File;

  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    role: UserRole.Organizer,
  };

  const mockConferenceSponsorDto: CreateConferenceSponsorDto = {
    brandName: "Test Sponsor",
    brandWebsite: "https://testsponsor.com",
    conferenceId: "conf-1",
    facebook: "testsponsor",
    twitter: "testsponsor",
    instagram: "testsponsor",
  };

  const mockUpdateConferenceSponsorDto: UpdateConferenceSponsorDto = {
    brandName: "Updated Sponsor",
    brandWebsite: "https://updatedsponsor.com",
  };

  const mockConferenceSponsorResponse: ConferenceSponsorResponseDto = {
    id: "sponsor-1",
    brandName: "Test Sponsor",
    brandWebsite: "https://testsponsor.com",
    brandImage: "uploads/conference-sponsors/test-123456.jpg",
    conferenceId: "conf-1",
    facebook: "testsponsor",
    twitter: "testsponsor",
    instagram: "testsponsor",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConferenceSponsorsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByConference: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConferenceSponsorsController],
      providers: [
        {
          provide: ConferenceSponsorsService,
          useValue: mockConferenceSponsorsService,
        },
      ],
    }).compile();

    controller = module.get<ConferenceSponsorsController>(
      ConferenceSponsorsController,
    );
    service = module.get<ConferenceSponsorsService>(ConferenceSponsorsService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a new conference sponsor", async () => {
      mockConferenceSponsorsService.create.mockResolvedValue(
        mockConferenceSponsorResponse,
      );

      const result = await controller.create(
        mockConferenceSponsorDto,
        mockFile,
        { user: mockUser },
      );

      expect(result).toEqual(mockConferenceSponsorResponse);
      expect(mockConferenceSponsorsService.create).toHaveBeenCalledWith(
        mockConferenceSponsorDto,
        mockFile,
        mockUser,
      );
    });

    it("should throw an error if service creation fails", async () => {
      mockConferenceSponsorsService.create.mockRejectedValue(
        new HttpException("Creation failed", HttpStatus.BAD_REQUEST),
      );

      try {
        await controller.create(mockConferenceSponsorDto, mockFile, {
          user: mockUser,
        });
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.message).toBe("Creation failed");
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });

  describe("findAll", () => {
    it("should return an array of conference sponsors", async () => {
      const mockResponse = [mockConferenceSponsorResponse];
      mockConferenceSponsorsService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll({ user: mockUser });

      expect(result).toEqual(mockResponse);
      expect(mockConferenceSponsorsService.findAll).toHaveBeenCalledWith(
        mockUser,
      );
    });
  });

  describe("findByConference", () => {
    it("should return an array of conference sponsors for a specific conference", async () => {
      const conferenceId = "conf-1";
      const mockResponse = [mockConferenceSponsorResponse];
      mockConferenceSponsorsService.findByConference.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.findByConference(conferenceId);

      expect(result).toEqual(mockResponse);
      expect(
        mockConferenceSponsorsService.findByConference,
      ).toHaveBeenCalledWith(conferenceId);
    });

    it("should handle case when no sponsors are found for a conference", async () => {
      const conferenceId = "non-existent-conf";
      mockConferenceSponsorsService.findByConference.mockResolvedValue([]);

      const result = await controller.findByConference(conferenceId);

      expect(result).toEqual([]);
      expect(
        mockConferenceSponsorsService.findByConference,
      ).toHaveBeenCalledWith(conferenceId);
    });
  });

  describe("findOne", () => {
    it("should return a single conference sponsor", async () => {
      const sponsorId = "sponsor-1";
      mockConferenceSponsorsService.findOne.mockResolvedValue(
        mockConferenceSponsorResponse,
      );

      const result = await controller.findOne(sponsorId);

      expect(result).toEqual(mockConferenceSponsorResponse);
      expect(mockConferenceSponsorsService.findOne).toHaveBeenCalledWith(
        sponsorId,
      );
    });

    it("should throw an error if sponsor is not found", async () => {
      const sponsorId = "non-existent-sponsor";
      mockConferenceSponsorsService.findOne.mockRejectedValue(
        new HttpException("Sponsor not found", HttpStatus.NOT_FOUND),
      );

      try {
        await controller.findOne(sponsorId);
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.message).toBe("Sponsor not found");
        expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });
  });

  describe("update", () => {
    it("should update a conference sponsor", async () => {
      const sponsorId = "sponsor-1";
      const updatedResponse = {
        ...mockConferenceSponsorResponse,
        brandName: "Updated Sponsor",
        brandWebsite: "https://updatedsponsor.com",
      };

      mockConferenceSponsorsService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(
        sponsorId,
        mockUpdateConferenceSponsorDto,
        mockFile,
        { user: mockUser },
      );

      expect(result).toEqual(updatedResponse);
      expect(mockConferenceSponsorsService.update).toHaveBeenCalledWith(
        sponsorId,
        mockUpdateConferenceSponsorDto,
        mockFile,
        mockUser,
      );
    });

    it("should handle updates without file upload", async () => {
      const sponsorId = "sponsor-1";
      const updatedResponse = {
        ...mockConferenceSponsorResponse,
        brandName: "Updated Sponsor",
        brandWebsite: "https://updatedsponsor.com",
      };

      mockConferenceSponsorsService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update(
        sponsorId,
        mockUpdateConferenceSponsorDto,
        null,
        { user: mockUser },
      );

      expect(result).toEqual(updatedResponse);
      expect(mockConferenceSponsorsService.update).toHaveBeenCalledWith(
        sponsorId,
        mockUpdateConferenceSponsorDto,
        null,
        mockUser,
      );
    });

    it("should throw an error if update fails", async () => {
      const sponsorId = "sponsor-1";
      mockConferenceSponsorsService.update.mockRejectedValue(
        new HttpException("Update failed", HttpStatus.BAD_REQUEST),
      );

      try {
        await controller.update(
          sponsorId,
          mockUpdateConferenceSponsorDto,
          mockFile,
          { user: mockUser },
        );
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.message).toBe("Update failed");
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });

  describe("remove", () => {
    it("should delete a conference sponsor", async () => {
      const sponsorId = "sponsor-1";
      mockConferenceSponsorsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(sponsorId, { user: mockUser });

      expect(result).toBeUndefined();
      expect(mockConferenceSponsorsService.remove).toHaveBeenCalledWith(
        sponsorId,
        mockUser,
      );
    });

    it("should throw an error if deletion fails", async () => {
      const sponsorId = "sponsor-1";
      mockConferenceSponsorsService.remove.mockRejectedValue(
        new HttpException("Deletion failed", HttpStatus.NOT_FOUND),
      );

      try {
        await controller.remove(sponsorId, { user: mockUser });
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.message).toBe("Deletion failed");
        expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });
  });
});
