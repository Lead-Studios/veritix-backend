import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  UseFilters,
  Req,
} from "@nestjs/common";
import { AuditLogService } from "../audit-log/audit-log.service";
import { AuditLogType } from "../audit-log/entities/audit-log.entity";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { UserResponseDto } from "./dto/user-response.dto";
import { ReportFilterDto } from "./dto/report-filter.dto";
import { ReportResponseDto } from "./dto/report-response.dto";
import { Logger } from "@nestjs/common";
import { AllExceptionsFilter } from "src/common/filters";
import { UserRole } from "src/common/enums/users-roles.enum";
import { JwtAuthGuard } from "security/guards/jwt-auth.guard";
import { RolesGuard } from "security/guards/rolesGuard/roles.guard";
import { AdminService } from "./providers/admin.service";
import { Roles, ROLES_KEY } from "security/decorators/roles.decorator";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("/api/v1/admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@UseFilters(AllExceptionsFilter)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get("all-users")
  @ApiOperation({ summary: "Retrieve all users" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of all users",
    type: [UserResponseDto],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Forbidden resource",
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: "Internal server error",
  })
  async getAllUsers(@Req() request: any): Promise<UserResponseDto[]> {
    try {
      this.logger.log("GET /admin/all-users - Retrieving all users");
      
      // Log admin action
      await this.auditLogService.create({
        type: AuditLogType.ADMIN_ACTION,
        adminId: request.user?.id,
        description: 'Admin retrieved all users',
        metadata: {
          action: 'getAllUsers',
          timestamp: new Date().toISOString(),
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });
      
      return await this.adminService.findAllUsers();
    } catch (error) {
      this.logger.error(
        `Error retrieving all users: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get("users/:id")
  @ApiOperation({ summary: "Retrieve a single user by ID" })
  @ApiParam({
    name: "id",
    description: "User ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "User details",
    type: UserResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "User not found" })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Forbidden resource",
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: "Internal server error",
  })
  async getUserById(@Param("id") id: string, @Req() request: any): Promise<UserResponseDto> {
    try {
      this.logger.log(`GET /admin/users/${id} - Retrieving user by ID`);
      
      // Log admin action
      await this.auditLogService.create({
        type: AuditLogType.ADMIN_ACTION,
        adminId: request.user?.id,
        description: `Admin retrieved user details for user ${id}`,
        metadata: {
          action: 'getUserById',
          userId: id,
          timestamp: new Date().toISOString(),
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });
      
      return await this.adminService.findUserById(id);
    } catch (error) {
      this.logger.error(
        `Error retrieving user with ID ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get("user/reports")
  @ApiOperation({ summary: "Generate user system reports" })
  @ApiQuery({ type: ReportFilterDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "User system reports",
    type: ReportResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid filter parameters",
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Unauthorized" })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Forbidden resource",
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: "Internal server error",
  })
  async generateUserReports(
    @Query() filterDto: ReportFilterDto,
    @Req() request: any,
  ): Promise<ReportResponseDto> {
    try {
      this.logger.log(
        `GET /admin/user/reports - Generating reports with filter: ${JSON.stringify(filterDto)}`,
      );
      
      // Log admin action
      await this.auditLogService.create({
        type: AuditLogType.ADMIN_ACTION,
        adminId: request.user?.id,
        description: 'Admin generated user reports',
        metadata: {
          action: 'generateUserReports',
          filters: filterDto,
          timestamp: new Date().toISOString(),
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        },
      });
      
      return await this.adminService.generateReports(filterDto);
    } catch (error) {
      this.logger.error(
        `Error generating reports: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
