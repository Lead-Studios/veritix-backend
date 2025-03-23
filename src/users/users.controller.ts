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
<<<<<<< HEAD:src/users/users.controller.ts
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
=======
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from 'security/guards/rolesGuard/roles.guard';
import { UserRole } from 'src/common/enums/users-roles.enum';
import { UpdateProfileDto, ChangePasswordDto, ProfileImageDto } from './dto/update-profile.dto';
import { RoleDecorator } from 'security/decorators/roles.decorator';
>>>>>>> 79d2cfe (feat: Implement User Profile Management\n Fix: issues with jwt must be a string or number):backend/src/users/users.controller.ts

@Controller("/api/v1/users")
export class UsersController {
  [x: string]: any;
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseInterceptors(ClassSerializerInterceptor)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // GET /users?limit=10&page=1
  @Get()
  async findAll(
    @Query("page", ParseIntPipe) page: number = 1,
    @Query("limit", ParseIntPipe) limit: number = 10,
  ) {
    return this.usersService.findAll(page, limit);
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

  @Get('/details/:id')
  async getDetails(@Req() req: { user: { userId: number } }) {
    return this.usersService.findById(req.user.userId);
  }

  @Put('/update-profile/:id')
  @RoleDecorator(UserRole.User)
  async updateProfile(
    @Req() req: { user: { userId: number } },
    @Body() dto: UpdateProfileDto
  ) {
    const userId = req.user.userId;
    return this.usersService.updateProfile(userId, dto);
  }

  @Put('/change-password/:id')
  @RoleDecorator(UserRole.User)
  async changePassword(
    @Req() req: { user: { userId: number } },
    @Body() dto: ChangePasswordDto
  ) {
    const userId = req.user.userId;
    return this.usersService.changePassword(userId, dto);
  }

  @Post('/upload/profile-image/:id')
  @RoleDecorator(UserRole.User)
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfileImage(
    @Req() req: { user: { userId: number } },
    @UploadedFile() file: any,
  ) {
    const imagePath = await this.fileService.storeProfileImage(file);
    return this.usersService.updateProfileImage(req.user.userId, imagePath);
  }
}