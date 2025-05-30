import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query, UseGuards, Req } from "@nestjs/common";
import { AuthService } from "./providers/auth.service";
import { SignInDto } from "./dto/create-auth.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { EmailDto } from "./dto/email.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from "@nestjs/passport";

@ApiTags('Auth')
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("sign-in")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'User sign in',
    description: 'Authenticate a user and return access & refresh tokens' 
  })
  @ApiBody({ type: SignInDto })
  @ApiResponse({ 
    status: 200, 
    description: 'User successfully authenticated',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '1',
          email: 'user@example.com',
          role: 'user'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  SignIn(@Body() signinDto: SignInDto) {
    return this.authService.signIn(signinDto);
  }

  @Post("refresh-token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Refresh access token', 
    description: 'Get a new access token using a refresh token' 
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Token successfully refreshed',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  public async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.authService.refreshToken(refreshTokenDto);
  }

  @Get("verify-email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Verify email address', 
    description: 'Verify user email using verification token sent to email' 
  })
  @ApiResponse({ status: 200, description: 'Email successfully verified' })
  @ApiResponse({ status: 400, description: 'Invalid verification token' })
  public async verifyEmail(@Query('token') token: string) {
    return await this.authService.verifyEmail(token);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Send verification email', 
    description: 'Send a new verification email to user' 
  })
  @ApiBody({ type: EmailDto })
  @ApiResponse({ status: 201, description: 'Verification email sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email address' })
  @ApiResponse({ status: 404, description: 'User not found' })
  public async sendVerificationEmail(@Body() emailDto: EmailDto) {
    return this.authService.sendVerificationEmail(emailDto);
  }

  //GOOGLE OAUTH ROUTES 
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Redirect to Google login
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req) {
    return this.authService.handleGoogleLogin(req.user);
  }
  
}
