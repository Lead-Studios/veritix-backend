import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  Get,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
  UploadedFile,
  UseInterceptors as NestUseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from './http/multer.config';
import { AdminAuthService } from "./providers/admin-auth.services";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { EmailDto } from "./dto/email.dto";
import { SignInDto } from "./dto/signIn.dto";
import { JwtAuthGuard } from "../../security/guards/jwt-auth.guard";
import { UploadProfileImageDto } from './dto/upload-profile-image.dto';
import { ChangePasswordDto } from "./dto/change-password.dto";

@Controller("admin/")
export class AdminAuthController {
  constructor(private adminAuthService: AdminAuthService) {}

  @Post("create")
  @UseInterceptors(ClassSerializerInterceptor)
  @HttpCode(201)
  async createAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.adminAuthService.createAdminUser(createAdminDto);
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() userDetails: SignInDto) {
    return this.adminAuthService.login(userDetails);
  }

  @Post("refresh-token")
  @HttpCode(200)
  async refreshToken(@Body("refreshToken") refreshToken: string) {
    return this.adminAuthService.refreshToken(refreshToken);
  }

  @Post("forgot-password")
  @HttpCode(200)
  async forgotPassword(@Body("email") email: string) {
    return this.adminAuthService.forgotPassword(email);
  }

  @Post("reset-password")
  @HttpCode(200)
  async resetPassword(
    @Query('token') token: string,
    @Body() passwordDto: ChangePasswordDto,
  ) {
    return this.adminAuthService.resetPassword(token, passwordDto);
  }

  @Post("send-token")
  @HttpCode(200)
  async sendVerification(@Body() emailDto: EmailDto) {
    return this.adminAuthService.sendVerificationEmail(emailDto);
  }

  @Get("verify-email")
  @HttpCode(200)
  async verifyEmail(
    @Query("token") token: string,
  ) {
    return this.adminAuthService.verifyEmail(token);
  }

  @Get("profile-details")
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.adminAuthService.getProfile(req.user.email);
  }
  /**
   * Upload profile image for admin users
   */
  @Post('upload/profile-image')
  @UseGuards(JwtAuthGuard)
  @NestUseInterceptors(FileInterceptor('file', multerConfig))
  @HttpCode(200)
  async uploadProfileImage(
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    return this.adminAuthService.uploadProfileImage(req.user.email, file);
  }
}
