import { Controller, Post, Body, HttpCode, HttpStatus, Param, Get, Query } from "@nestjs/common";
import { AuthService } from "./providers/auth.service";
import { SignInDto } from "./dto/create-auth.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { EmailDto } from "./dto/email.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("sign-in")
  @HttpCode(HttpStatus.OK)
  public SignIn(@Body() signinDto: SignInDto) {
    return this.authService.signIn(signinDto);
  }

  @Post("refresh-token")
  @HttpCode(HttpStatus.OK)
  public async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.authService.refreshToken(refreshTokenDto);
  }

  @Get("verify-email")
  @HttpCode(HttpStatus.OK)
  public async verifyEmail(@Query('token') token: string) {
    return await this.authService.verifyEmail(token);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.CREATED)
  public async sendVerificationEmail(@Body() emailDto: EmailDto) {
    return this.authService.sendVerificationEmail(emailDto);
  }
}
