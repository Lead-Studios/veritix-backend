import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ClassSerializerInterceptor,
  UseInterceptors,
  Query,
  ParseIntPipe,
  NotFoundException,
  Patch,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UnauthorizedException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtAuthGuard } from "security/guards/jwt-auth.guard";
import { UpdateProfileDto, ChangePasswordDto } from "./dto/update-profile.dto";
import { JsonWebTokenError } from "jsonwebtoken";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { RequestWithUser } from "src/common/interfaces/request.interface";
import { UserRole } from "src/common/enums/users-roles.enum";
import { Roles } from "../../security/decorators/roles.decorator";
import { RolesGuard } from "../../security/guards/rolesGuard/roles.guard";
import { Role } from "src/collaborator/enum/role.enum";
@ApiTags("Users")
@Controller("users")
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  @Post()
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiOperation({ summary: "Create new user" })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: "User successfully created",
    type: CreateUserDto,
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get("details")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user details" })
  @ApiResponse({
    status: 200,
    description: "User details retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getUserDetails(@Req() request: RequestWithUser) {
    const user = request.user;

    if (!user?.userId) {
      throw new UnauthorizedException("Invalid user information");
    }

    return this.usersService.findOneById(user.userId.toString());
  }

  @Put("update-profile")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user profile" })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: "Profile updated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async updateUserProfile(
    @Req() request: RequestWithUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const user = request.user;

    if (!user || !user.userId) {
      this.logger.error(
        "Invalid user information:",
        JSON.stringify(user, null, 2),
      );
      throw new JsonWebTokenError("Invalid user information");
    }

    return this.usersService.updateProfile(
      user.userId.toString(),
      updateProfileDto,
    );
  }

  @Put("/change-password")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change user password" })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: "Password changed successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 400, description: "Invalid password" })
  async changePassword(
    @Req() request: RequestWithUser,
    @Body() dto: ChangePasswordDto,
  ) {
    const user = request.user;
    if (!user || !user.userId) {
      throw new Error("Invalid user information");
    }
    return this.usersService.changePassword(user.userId.toString(), dto);
  }

  @Get()
  @ApiOperation({ summary: "Get all users" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number for pagination",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Number of items per page",
  })
  @ApiResponse({
    status: 200,
    description: "List of users retrieved successfully",
    schema: {
      properties: {
        users: {
          type: "array",
          items: { $ref: "#/components/schemas/CreateUserDto" },
        },
        total: {
          type: "number",
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  public async findAll(
    @Query() pagination?: { limits: number; page: number },
  ): Promise<{ users: CreateUserDto[]; total: number }> {
    const { limits = 20, page = 1 } = pagination || {};

    const validPage = Math.max(1, page || 1);
    const validLimit = Math.max(1, Math.min(100, limits || 20));
    const result = await this.usersService.findAll(validPage, validLimit);
    // The service already returns the desired structure { total, page, limit, data }
    return {
      users: result.data,
      total: result.total,
    };
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get user by ID" })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiResponse({ status: 200, description: "User found" })
  @ApiResponse({ status: 404, description: "User not found" })
  async findOne(@Param("id") id: string) {
    return await this.usersService.findOneById(id);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Delete user" })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiResponse({ status: 200, description: "User deleted successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  async remove(@Param("id") id: string) {
    return await this.usersService.remove(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  public async updateUser(
    @Body() updateUserDto: UpdateUserDto,
    @Param("id") id: string,
  ) {
    const user = await this.usersService.updateUser(id, updateUserDto);

    if (!user) {
      throw new NotFoundException("No user was found");
    }
    return user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN)
  @Get("profile")
  async getProfile(@Req() request: RequestWithUser) {
    const user = request.user;
    if (!user || !user.id) {
      this.logger.error("Invalid userId:", user?.id);
      throw new JsonWebTokenError("Invalid userId");
    }
    return this.usersService.findOneById(user.id.toString());
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN)
  @Get("me")
  async getCurrentUser(@Req() request: RequestWithUser) {
    const user = request.user;
    if (!user || !user.id) {
      this.logger.error(
        "Invalid user information:",
        JSON.stringify(user, null, 2),
      );
      throw new JsonWebTokenError("Invalid user information");
    }
    return this.usersService.findOneById(user.id.toString());
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN)
  @Patch("profile")
  async updateProfile(
    @Req() request: RequestWithUser,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = request.user;
    if (!user || !user.id) {
      this.logger.error(
        "Invalid user information:",
        JSON.stringify(user, null, 2),
      );
      throw new JsonWebTokenError("Invalid user information");
    }
    return this.usersService.updateUser(user.id.toString(), updateUserDto);
  }
}
