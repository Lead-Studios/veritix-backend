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

    return this.usersService.findOneById(user.userId.toString());
  }

  @Put("update-profile")
  @UseGuards(JwtAuthGuard)
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
  public async findAll(
    @Query() pagination?: { limits: number; page: number },
  ): Promise<{ users: CreateUserDto[]; total: number }> {
    const { limits = 20, page = 1 } = pagination || {};

    const [users, total] = await this.usersRepository.findAndCount({
      take: limits,
      skip: (page - 1) * limits,
    });
    return { users: users, total };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get user by ID" })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiResponse({ status: 200, description: "User found" })
  @ApiResponse({ status: 404, description: "User not found" })
  findOne(@Param("id") id: string) {
    return this.usersService.findOneById(id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete user" })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiResponse({ status: 200, description: "User deleted successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  remove(@Param("id") id: string) {
    return this.usersService.remove(parseInt(id, 10));
  }

  @Patch(":id")
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

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  async getProfile(@Req() request: RequestWithUser) {
    const user = request.user;
    if (!user || !user.id) {
      this.logger.error("Invalid userId:", user?.id);
      throw new JsonWebTokenError("Invalid userId");
    }
    return this.usersService.findOneById(user.id.toString());
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
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
