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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from 'security/guards/rolesGuard/roles.guard';
import { UserRole } from 'src/common/enums/users-roles.enum';
import { UpdateProfileDto, ChangePasswordDto, ProfileImageDto } from './dto/update-profile.dto';
import { RoleDecorator } from 'security/decorators/roles.decorator';
import { Request } from 'express';
import { JwtAuthGuard } from "security/guards/jwt-auth.guard";
import { request } from "http";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";

@Controller("users")
export class UsersController {
  [x: string]: any;
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    private readonly usersService: UsersService
  ) {}

  @Post()
  @UseInterceptors(ClassSerializerInterceptor)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
  

  /// USER PROFILE ENDPOINTS

  // GET /users/details
  @Get('details')
  @UseGuards(JwtAuthGuard)
  async getUserDetails(@Req() request: Request) {
    const user = request.user as any;
  
    if (!user?.userId) {
      throw new UnauthorizedException('User information missing');
    }

    // Convert to number using safe parsing
    const userId = Number(user.userId) || Number(user.sub);
    
    if (isNaN(userId) || !Number.isInteger(userId) || userId <= 0) {
      console.error('Invalid user ID from JWT:', user.userId);
      throw new Error('Invalid user identification');
    }
    return this.usersService.findOneById(userId);
  }

  // PUT /users/update-profile
  @Put('update-profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Req() request: Request,
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    const user = request.user as any;
    
    if (!user || !user.userId) {
      throw new Error('Invalid user information');
    }
    
    // Pass the numeric userId to the service
    return this.usersService.updateProfile(user.userId, updateProfileDto);
  }

  // PUT /users/change-password
  @Put('/change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() request: Request,
    @Body() dto: ChangePasswordDto
  ) {
    const user = request.user as any;
    if (!user || !user.userId) {
      throw new Error('Invalid user information');
    }
    return this.usersService.changePassword(user.userId, dto);
  }

  @Post('/upload/profile-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfileImage(
    @Req() request: Request,
    @UploadedFile() file: any,
  ) {

    const user = request.user as any;

    const userId = Number(user?.userId) || Number(user?.sub);

    if (!userId) {
      throw new UnauthorizedException('User information missing');
    }

    const profileImageDto: ProfileImageDto = {
      imageUrl: file.path || file.filename || file.originalname
    };

    return this.usersService.updateProfileImage(userId, profileImageDto);
  }


  /// OTHER ENDPOINTS
  // GET /users?limit=10&page=1
  @Get()
  public async findAll(pagination?: {
    limits: number;
    page: number;
  }): Promise<{ users: CreateUserDto[]; total: number }> {
    // set default limits and page we want
    const { limits = 20, page = 1 } = pagination || {};

    const [users, total] = await this.usersRepository.findAndCount({
      take: limits,
      skip: (page - 1) * limits,
    });
    return { users: users, total };
  }

  // DELETE /users/:id
  @Delete(":id")
  async softDelete(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.softDelete(id);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.usersService.findOneById(+id);
  }

  @Delete(":id")
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
