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
  InternalServerErrorException,
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
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { JsonWebTokenError } from "jsonwebtoken";

// Define a type for the authenticated request
interface RequestWithUser extends Request {
  user: {
    userId?: number | string;
    sub?: number | string;
    [key: string]: any;
  };
}

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
  @UseGuards(JwtAuthGuard)
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

    // Convert to number using safe parsing
    const userId = Number(user.userId) || Number(user.sub);

    if (isNaN(userId) || !Number.isInteger(userId) || userId <= 0) {
      this.logger.error("Invalid userId:", user.userId);
      throw new JsonWebTokenError("Invalid userId");
    }
    return this.usersService.findOneById(userId);
  }

  @Put("update-profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user profile" })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: "Profile updated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async updateProfile(
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

    // Convert to number using safe parsing
    const userId = Number(user.userId) || Number(user.sub);

    if (isNaN(userId) || !Number.isInteger(userId) || userId <= 0) {
      this.logger.error("Invalid userId:", user.userId);
      throw new JsonWebTokenError("Invalid userId");
    }

    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  @Put("/change-password")
  @UseGuards(JwtAuthGuard)
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
      this.logger.error("Invalid user information");
      throw new UnauthorizedException("Invalid user information");
    }
    const userId = Number(user.userId) || Number(user.sub);
    if (isNaN(userId) || !Number.isInteger(userId) || userId <= 0) {
      this.logger.error("Invalid userId:", user.userId);
      throw new JsonWebTokenError("Invalid userId");
    }
    return this.usersService.changePassword(userId, dto);
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
  public async findAll(
    @Query() pagination?: { limits: number; page: number },
  ): Promise<{ users: User[]; total: number }> {
    // set default limits and page we want
    const { limits = 20, page = 1 } = pagination || {};

    try {
      const [users, total] = await this.usersRepository.findAndCount({
        take: limits,
        skip: (page - 1) * limits,
      });
      return { users, total };
    } catch (error) {
      this.logger.error(`Error fetching users: ${error.message}`, error.stack);
      throw new InternalServerErrorException("Could not retrieve users");
    }
  }

  @Get(":id")
  @ApiOperation({ summary: "Get user by ID" })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiResponse({ status: 200, description: "User found" })
  @ApiResponse({ status: 404, description: "User not found" })
  findOne(@Param("id") id: string) {
    return this.usersService.findOneById(+id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete user" })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiResponse({ status: 200, description: "User deleted successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  remove(@Param("id") id: string) {
    return this.usersService.remove(+id);
  }

  /**Patch endpoint */
  @Patch(":id")
  public async updateUser(
    @Body() updateUserDto: UpdateUserDto,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const user = await this.usersService.updateUser(id, updateUserDto);

    /**if user does not exist */
    if (!user) {
      throw new NotFoundException("No user was found");
    }
    return user;
  }
}
