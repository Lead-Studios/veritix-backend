import { Test, type TestingModule } from "@nestjs/testing";
import AdminController from "../admin.controller";
import { UserNotFoundException } from "../../common/exceptions/user-not-found.exception";
import { UserRole } from "src/common/enums/users-roles.enum";
import { AdminService } from "../providers/admin.service";
import { ReportPeriodEnum } from "src/common/enums/report-period.enum";
import { InvalidReportParametersException } from "src/common/exceptions/invalid-report.exception-parameters";

describe("AdminController", () => {
  let controller: AdminController;
  let service: AdminService;

  beforeEach(async () => {
    const mockAdminService = {
      findAllUsers: jest.fn(),
      findUserById: jest.fn(),
      generateReports: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get<AdminService>(AdminService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getAllUsers", () => {
    it("should return an array of users", async () => {
      const mockUsers = [
        {
          id: "1",
          username: "test1",
          email: "test1@example.com",
          firstName: "Test",
          lastName: "User",
          role: UserRole.ADMIN,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      jest.spyOn(service, "findAllUsers").mockResolvedValue(mockUsers);

      const result = await controller.getAllUsers();

      expect(result).toBe(mockUsers);
      expect(service.findAllUsers).toHaveBeenCalled();
    });

    it("should handle errors and rethrow", async () => {
      const error = new Error("Service error");
      jest.spyOn(service, "findAllUsers").mockRejectedValue(error);

      await expect(controller.getAllUsers()).rejects.toThrow(error);
    });
  });

  describe("getUserById", () => {
    it("should return a user if found", async () => {
      const mockUser = {
        id: "1",
        username: "test1",
        email: "test1@example.com",
        firstName: "Test",
        lastName: "User",
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, "findUserById").mockResolvedValue(mockUser);

      const result = await controller.getUserById(1);

      expect(result).toBe(mockUser);
      expect(service.findUserById).toHaveBeenCalledWith(1);
    });

    it("should handle UserNotFoundException", async () => {
      jest
        .spyOn(service, "findUserById")
        .mockRejectedValue(new UserNotFoundException(999));

      await expect(controller.getUserById(99)).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe("generateUserReports", () => {
    it("should return report data", async () => {
      const mockReport = {
        totalUsers: 10,
        activeUsers: 8,
        inactiveUsers: 2,
        usersByRole: {
          [UserRole.USER]: 7,
          [UserRole.ADMIN]: 3,
        },
        period: ReportPeriodEnum.WEEK,
        generatedAt: new Date(),
      };

      jest.spyOn(service, "generateReports").mockResolvedValue(mockReport);

      const filterDto = { period: ReportPeriodEnum.WEEK };
      const result = await controller.generateUserReports(filterDto);

      expect(result).toBe(mockReport);
      expect(service.generateReports).toHaveBeenCalledWith(filterDto);
    });

    it("should handle InvalidReportParametersException", async () => {
      jest
        .spyOn(service, "generateReports")
        .mockRejectedValue(
          new InvalidReportParametersException("Invalid period"),
        );

      const filterDto = { period: ReportPeriodEnum.CUSTOM };
      await expect(controller.generateUserReports(filterDto)).rejects.toThrow(
        InvalidReportParametersException,
      );
    });
  });
});
