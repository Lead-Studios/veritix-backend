import { Injectable, Logger } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { UserNotFoundException } from "src/common/exceptions/user-not-found.exception"
import { ReportPeriodEnum } from "src/common/enums/report-period.enum"
import { InvalidReportParametersException } from "src/common/exceptions/invalid-report.exception-parameters"
import { User } from "src/users/entities/user.entity"
import type { UserResponseDto } from "../dto/user-response.dto"
import type { ReportFilterDto } from "../dto/report-filter.dto"
import type { ReportResponseDto } from "../dto/report-response.dto"
import { Admin } from "../entities/admin.entity"


@Injectable()
export class AdminService {
  setResetToken(id: number, resetTokenHash: string, resetTokenExpiry: Date) {
    throw new Error('Method not implemented.')
  }
  updatePassword(id: number, hashedPassword: string) {
    throw new Error('Method not implemented.')
  }
  findOneById(adminId: number) {
    throw new Error('Method not implemented.')
  }
  setVerificationToken(id: any, tokenHash: string, tokenExpiry: Date) {
    throw new Error('Method not implemented.')
  }
  verifyEmail(id: number) {
    throw new Error('Method not implemented.')
  }
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  async findOneByEmail(email: string): Promise<Admin | undefined> {
    return this.adminRepository.findOne({ where: { email } });
  }

  async setRefreshToken(id: number, refreshToken: string): Promise<void> {
    await this.adminRepository.update(id, { refreshToken });
  }
  async findAllUsers(): Promise<UserResponseDto[]> {
    try {
      this.logger.log("Retrieving all users")
      const users = await this.usersRepository.find()
      return users.map((user) => this.mapToUserResponseDto(user))
    } catch (error) {
      this.logger.error(`Failed to retrieve all users: ${error.message}`, error.stack)
      throw error
    }
  }

  async findUserById(id: number): Promise<UserResponseDto> {
    try {
      this.logger.log(`Retrieving user with ID: ${id}`)
      const user = await this.usersRepository.findOne({ where: { id } })

      if (!user) {
        throw new UserNotFoundException(id)
      }

      return this.mapToUserResponseDto(user)
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        throw error
      }
      this.logger.error(`Failed to retrieve user with ID ${id}: ${error.message}`, error.stack)
      throw error
    }
  }

  async generateReports(filterDto: ReportFilterDto): Promise<ReportResponseDto> {
    try {
      const { period, startDate, endDate } = filterDto
      this.logger.log(`Generating reports with period: ${period}`)

      // Validate date range for custom period
      if (period === ReportPeriodEnum.CUSTOM) {
        if (!startDate || !endDate) {
          throw new InvalidReportParametersException("Start date and end date are required for custom period")
        }

        if (new Date(startDate) > new Date(endDate)) {
          throw new InvalidReportParametersException("Start date must be before end date")
        }
      }

      // Build query based on filter period
      let query = this.usersRepository.createQueryBuilder("user")

      switch (period) {
        case ReportPeriodEnum.WEEK:
          // Filter for weekly report
          const oneWeekAgo = new Date()
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
          query = query.where("user.createdAt >= :oneWeekAgo", { oneWeekAgo })
          break

        case ReportPeriodEnum.MONTH:
          // Filter for monthly report
          const oneMonthAgo = new Date()
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
          query = query.where("user.createdAt >= :oneMonthAgo", { oneMonthAgo })
          break

        case ReportPeriodEnum.YEAR:
          // Filter for yearly report
          const oneYearAgo = new Date()
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
          query = query.where("user.createdAt >= :oneYearAgo", { oneYearAgo })
          break

        case ReportPeriodEnum.CUSTOM:
          // Custom date range
          query = query.where("user.createdAt BETWEEN :startDate AND :endDate", {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          })
          break

        default:
          throw new InvalidReportParametersException(`Unsupported period: ${period}`)
      }

      const users = await query.getMany()

      // Generate report statistics
      const totalUsers = users.length
      const activeUsers = users.filter((user) => user.isActive).length
      const inactiveUsers = totalUsers - activeUsers

      // Group users by role
      const usersByRole = this.groupUsersByRole(users)

      return {
        totalUsers,
        activeUsers,
        inactiveUsers,
        usersByRole,
        period,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        generatedAt: new Date(),
      }
    } catch (error) {
      if (error instanceof InvalidReportParametersException) {
        throw error
      }
      this.logger.error(`Failed to generate reports: ${error.message}`, error.stack)
      throw error
    }
  }

  private mapToUserResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      refreshToken: null, // TODO: Implement refresh token retrieval and mapping

    }
  }

  private groupUsersByRole(users: User[]): Record<string, number> {
    return users.reduce(
      (acc, user) => {
        const role = user.role || "undefined"
        acc[role] = (acc[role] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
  }
}

