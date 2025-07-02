import { Controller, Get, Put, Post, Body, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ProfileService } from '../services/profile.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from '../dtos/update-profile.dto';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { File as MulterFile } from 'multer';

@ApiTags('User Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('details')
  @ApiOperation({ summary: 'Get user details' })
  async getDetails(@Req() req) {
    return this.profileService.getProfile(req.user.userId);
  }

  @Put('update-profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(req.user.userId, dto);
  }

  @Put('change-password')
  @ApiOperation({ summary: 'Change user password' })
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    return this.profileService.changePassword(req.user.userId, dto);
  }

  @Post('upload/profile-image')
  @ApiOperation({ summary: 'Upload or update profile image' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfileImage(@Req() req, @UploadedFile() file: MulterFile) {
    return this.profileService.uploadProfileImage(req.user.userId, file);
  }
} 