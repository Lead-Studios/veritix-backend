import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { AdminService } from "../providers/admin.service";
import { User } from "../../users/entities/user.entity";
import { UserNotFoundException } from "../../common/exceptions/user-not-found.exception";
import { InvalidReportParametersException } from "../../common/exceptions/invalid-report.exception-parameters";
import { ReportPeriodEnum } from "../../common/enums/report-period.enum";
import { UserRole } from "../../common/enums/users-roles.enum";

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe("AdminService", () => {
  let service: AdminService;
  let userRepository: MockRepository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(User),
          useFactory: createMockRepository,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    userRepository = module.get<MockRepository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAllUsers", () => {
    it("should return an array of users", async () => {
      const mockUsers = [
        {
          id: "1",
          username: "test1",
          email: "test1@example.com",
          password: "password",
          firstName: "Test",
          lastName: "User",
          role: UserRole.USER,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          username: "test2",
          email: "test2@example.com",
          password: "password",
          firstName: "Test",
          lastName: "Admin",
          role: UserRole.ADMIN,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      userRepository.find.mockResolvedValue(mockUsers);

      const result = await service.findAllUsers();

      expect(result).toHaveLength(2);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("2");
    });

    it("should handle errors and rethrow", async () => {
      const error = new Error("Database error");
      userRepository.find.mockRejectedValue(error);

      await expect(service.findAllUsers()).rejects.toThrow(error);
    });
  });

  describe("findUserById", () => {
    it("should return a user if found", async () => {
      const mockUser = {
        id: "1",
        username: "test1",
        email: "test1@example.com",
        password: "password",
        firstName: "Test",
        lastName: "User",
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findUserById(1);

      expect(result).toBeDefined();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: "1", deletedAt: null },
      });
      expect(result.id).toBe(1);
    });

    it("should throw UserNotFoundException if user not found", async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findUserById(999)).rejects.toThrow(
        UserNotFoundException,
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999, deletedAt: null },
      });
    });

    it("should handle errors and rethrow", async () => {
      const error = new Error("Database error");
      userRepository.findOne.mockRejectedValue(error);

      await expect(service.findUserById(1)).rejects.toThrow(error);
    });
  });

  describe("generateReports", () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    beforeEach(() => {
      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it("should generate weekly report", async () => {
      const mockUsers = [
        {
          id: "1",
          username: "test1",
          email: "test1@example.com",
          role: UserRole.USER,
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: "2",
          username: "test2",
          email: "test2@example.com",
          role: UserRole.ADMIN,
          isActive: false,
          createdAt: new Date(),
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockUsers);

      const result = await service.generateReports({
        period: ReportPeriodEnum.WEEK,
      });

      expect(result).toBeDefined();
      expect(result.totalUsers).toBe(2);
      expect(result.activeUsers).toBe(1);
      expect(result.inactiveUsers).toBe(1);
      expect(result.usersByRole).toEqual({
        [UserRole.USER]: 1,
        [UserRole.ADMIN]: 1,
      });
      expect(result.period).toBe(ReportPeriodEnum.WEEK);
      expect(userRepository.createQueryBuilder).toHaveBeenCalledWith("user");
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "user.deletedAt IS NULL",
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "user.createdAt >= :oneWeekAgo",
        expect.any(Object),
      );
    });

    it("should generate monthly report", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateReports({
        period: ReportPeriodEnum.MONTH,
      });

      expect(result).toBeDefined();
      expect(result.period).toBe(ReportPeriodEnum.MONTH);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "user.createdAt >= :oneMonthAgo",
        expect.any(Object),
      );
    });

    it("should generate yearly report", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.generateReports({
        period: ReportPeriodEnum.YEAR,
      });

      expect(result).toBeDefined();
      expect(result.period).toBe(ReportPeriodEnum.YEAR);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "user.createdAt >= :oneYearAgo",
        expect.any(Object),
      );
    });

    it("should generate custom period report", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const startDate = "2023-01-01";
      const endDate = "2023-12-31";

      const result = await service.generateReports({
        period: ReportPeriodEnum.CUSTOM,
        startDate,
        endDate,
      });

      expect(result).toBeDefined();
      expect(result.period).toBe(ReportPeriodEnum.CUSTOM);
      expect(result.startDate).toEqual(new Date(startDate));
      expect(result.endDate).toEqual(new Date(endDate));
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "user.createdAt BETWEEN :startDate AND :endDate",
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      );
    });

    it("should throw InvalidReportParametersException for custom period without dates", async () => {
      await expect(
        service.generateReports({ period: ReportPeriodEnum.CUSTOM }),
      ).rejects.toThrow(InvalidReportParametersException);
    });

    it("should throw InvalidReportParametersException for invalid date range", async () => {
      const startDate = "2023-12-31";
      const endDate = "2023-01-01"; // End date before start date

      await expect(
        service.generateReports({
          period: ReportPeriodEnum.CUSTOM,
          startDate,
          endDate,
        }),
      ).rejects.toThrow(InvalidReportParametersException);
    });

    it("should handle database errors and rethrow", async () => {
      const error = new Error("Database error");
      mockQueryBuilder.getMany.mockRejectedValue(error);

      await expect(
        service.generateReports({ period: ReportPeriodEnum.WEEK }),
      ).rejects.toThrow(error);
    });
  });
});
