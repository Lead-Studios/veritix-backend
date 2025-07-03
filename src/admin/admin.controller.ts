import { Controller, Post, Body, Get, UseGuards, Request, UploadedFile, UseInterceptors } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto, LoginAdminDto, ForgetPasswordDto, ResetPasswordDto, RefreshTokenDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('create')
  async create(@Body() dto: CreateAdminDto) {
    return this.adminService.createAdmin(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginAdminDto) {
    return this.adminService.login(dto);
  }

  @Post('forget/password')
  async forgetPassword(@Body() dto: ForgetPasswordDto) {
    return this.adminService.forgetPassword(dto);
  }

  @Post('reset/password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.adminService.resetPassword(dto);
  }

  @Post('refresh-token')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.adminService.refreshToken(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('profile/details')
  async profile(@Request() req) {
    return this.adminService.getProfile(req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('upload/profile-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfileImage(@UploadedFile() file: any, @Request() req) {
    return this.adminService.uploadProfileImage(req.user, file);
  }
}
