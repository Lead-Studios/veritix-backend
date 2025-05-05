import {
  forwardRef,
  Injectable,
  Logger,
  Inject,
  InternalServerErrorException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { DeepPartial, Repository } from "typeorm";
import { UserNotFoundException } from "src/common/exceptions/user-not-found.exception";
import { ReportPeriodEnum } from "src/common/enums/report-period.enum";
import { InvalidReportParametersException } from "src/common/exceptions/invalid-report.exception-parameters";
import { User } from "src/users/entities/user.entity";
import type { UserResponseDto } from "../dto/user-response.dto";
import type { ReportFilterDto } from "../dto/report-filter.dto";
import type { ReportResponseDto } from "../dto/report-response.dto";
import { Admin } from "../entities/admin.entity";
import { UsersService } from "src/users/users.service";
import { CreateAdminDto } from "../dto/create-admin.dto";
import { HashingProvider } from "./hashing-services";
import { GenerateTokenProvider } from "../../common/utils/generate-token.provider";
import { UpdateAdminDto } from "../dto/update-admin.dto";

@Injectable()
export class AdminService {
  setResetToken(id: number, resetTokenHash: string, resetTokenExpiry: Date) {
    throw new Error("Method not implemented.");
  }
  updatePassword(id: number, hashedPassword: string) {
    throw new Error("Method not implemented.");
  }
  findOneById(adminId: number) {
    throw new Error("Method not implemented.");
  }
  setVerificationToken(id: any, tokenHash: string, tokenExpiry: Date) {
    throw new Error("Method not implemented.");
  }
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,

    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,

    private readonly hashingProvider: HashingProvider,
    private readonly generateTokenProvider: GenerateTokenProvider,
  ) {}

  async createUser(
    createAdminDto: CreateAdminDto,
  ): Promise<{ admin: Admin; token: string }> {
    this.logger.log(`Creating user with email: ${createAdminDto.email}`);
    const { email } = createAdminDto;
    let existingUser: Admin;

    try {
      existingUser = await this.findOneByEmail(email);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Error finding user: ${error.message}`);
        this.logger.error(`Error stack: ${error.stack}`);
        throw new InternalServerErrorException(
          "An unexpected error occurred while finding user.",
        );
      }
      this.logger.error("An unknown error occurred while finding user.");
      this.logger.error(`Error: ${JSON.stringify(error, null, 2)}`, {
        description: "An unknown error occurred",
      });
      throw new InternalServerErrorException("An unknown error occurred.");
    }

    if (existingUser) {
      this.logger.warn(
        `User with email ${createAdminDto.email} already exists.`,
      );
      throw new ConflictException("User already exists. Use a different email");
    }
    const hashedPassword = await this.hashingProvider.hashPassword(
      createAdminDto.password,
    );
    try {
      const newUser: DeepPartial<Admin> = this.adminRepository.create({
        ...createAdminDto,
        password: hashedPassword,
      });

      const savedUser = await this.adminRepository.save(newUser);

      // Generate token and send an email to the user for verification
      const verification_token =
        await this.generateTokenProvider.generateVerificationToken(savedUser);
      this.logger.log(
        `Verification token generated for user: ${JSON.stringify(verification_token, null, 2)}`,
      );

      return { admin: savedUser, token: verification_token };
    } catch (error: any) {
      this.logger.error(`Error saving user: ${error.message}`);
      throw error;
    }
  }

  async findOneByEmail(email: string): Promise<Admin | null> {
    return this.adminRepository.findOne({ where: { email } });
  }

  async setRefreshToken(id: number, refreshToken: string): Promise<void> {
    await this.adminRepository.update(id, { refreshToken });
  }
  async findAllUsers(): Promise<UserResponseDto[]> {
    try {
      this.logger.log("Retrieving all users");
      const users = await this.usersRepository.find();
      return users.map((user) => this.mapToUserResponseDto(user));
    } catch (error) {
      this.logger.error(
        `Failed to retrieve all users: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateAdminUser(
    id: number,
    updateUserDto: UpdateAdminDto,
    internalFields?: Partial<Pick<User, "isVerified">>,
  ): Promise<Admin | null> {
    const user = await this.adminRepository.findOne({ where: { id } });
    if (!user) {
      return null;
    }

    // Check if email is unique before updating
    if (updateUserDto.email) {
      const existingUser = await this.adminRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser && existingUser.id !== id) {
        throw new UnauthorizedException(
          "You are not authorized to perform this action",
        );
      }
    }

    // Ensure only specified fields are updated, excluding id
    const allowedUpdates = ["name", "email", "userName", "password"];
    for (const key of Object.keys(updateUserDto)) {
      if (allowedUpdates.includes(key)) {
        (user as any)[key] = (updateUserDto as any)[key];
      }
    }

    // Handle internal fields if provided
    if (internalFields && internalFields.isVerified !== undefined) {
      // check if user has been verified
      if (!user.isVerified) {
        user.isVerified = internalFields.isVerified;
      }
    }

    return this.adminRepository.save(user);
  }

  async findUserById(id: string): Promise<UserResponseDto> {
    try {
      this.logger.log(`Retrieving user with ID: ${id}`);
      const user = await this.usersRepository.findOne({ where: { id } });

      if (!user) {
        throw new UserNotFoundException(id);
      }

      return this.mapToUserResponseDto(user);
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve user with ID ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async generateReports(
    filterDto: ReportFilterDto,
  ): Promise<ReportResponseDto> {
    try {
      const { period, startDate, endDate } = filterDto;
      this.logger.log(`Generating reports with period: ${period}`);

      // Validate date range for custom period
      if (period === ReportPeriodEnum.CUSTOM) {
        if (!startDate || !endDate) {
          throw new InvalidReportParametersException(
            "Start date and end date are required for custom period",
          );
        }

        if (new Date(startDate) > new Date(endDate)) {
          throw new InvalidReportParametersException(
            "Start date must be before end date",
          );
        }
      }

      // Build query based on filter period
      let query = this.usersRepository.createQueryBuilder("user");

      switch (period) {
        case ReportPeriodEnum.WEEK:
          // Filter for weekly report
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          query = query.where("user.createdAt >= :oneWeekAgo", { oneWeekAgo });
          break;

        case ReportPeriodEnum.MONTH:
          // Filter for monthly report
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          query = query.where("user.createdAt >= :oneMonthAgo", {
            oneMonthAgo,
          });
          break;

        case ReportPeriodEnum.YEAR:
          // Filter for yearly report
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          query = query.where("user.createdAt >= :oneYearAgo", { oneYearAgo });
          break;

        case ReportPeriodEnum.CUSTOM:
          // Custom date range
          query = query.where(
            "user.createdAt BETWEEN :startDate AND :endDate",
            {
              startDate: new Date(startDate),
              endDate: new Date(endDate),
            },
          );
          break;

        default:
          throw new InvalidReportParametersException(
            `Unsupported period: ${period}`,
          );
      }

      const users = await query.getMany();

      // Generate report statistics
      const totalUsers = users.length;
      const activeUsers = users.filter((user) => user.isActive).length;
      const inactiveUsers = totalUsers - activeUsers;

      // Group users by role
      const usersByRole = this.groupUsersByRole(users);

      return {
        totalUsers,
        activeUsers,
        inactiveUsers,
        usersByRole,
        period,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        generatedAt: new Date(),
      };
    } catch (error) {
      if (error instanceof InvalidReportParametersException) {
        throw error;
      }
      this.logger.error(
        `Failed to generate reports: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // let startDate: Date, endDate: Date;

  //   const today = new Date();

  //   if (ReportPeriodEnum.WEEK) {
  //     startDate = startOfWeek(today);
  //     endDate = endOfWeek(today);
  //   } else if (ReportPeriodEnum.MONTH) {
  //     startDate = startOfMonth(today);
  //     endDate = endOfMonth(today);
  //   } else if (ReportPeriodEnum.YEAR) {
  //     startDate = startOfYear(today);
  //     endDate = endOfYear(today);
  //   } else {
  //     startDate = startOfDay(today);
  //     endDate = endOfDay(today);
  //   }

  //   return this.eventRepository.find({
  //     where: {
  //       createdAt: Between(startDate, endDate),
  //       isArchived: false, // Exclude archived events from reports
  //     },
  //   });

  private mapToUserResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.userName,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      refreshToken: null, // TODO: Implement refresh token retrieval and mapping
    };
  }

  private groupUsersByRole(users: User[]): Record<string, number> {
    return users.reduce(
      (acc, user) => {
        const role = user.role || "undefined";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
