import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { AuthService } from "./providers/auth.service";
import { SignInDto } from "./dto/create-auth.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";

@Controller("/api/v1/auth")
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
    return this.authService.refreshToken(refreshTokenDto);
  }
}
