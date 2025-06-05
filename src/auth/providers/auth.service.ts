import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { SignInDto } from "../dto/create-auth.dto";
import { RefreshTokenDto } from "../dto/refresh-token.dto";
import { SignInProvider } from "./sign-in.provider";
import { RefreshTokenProvider } from "./refresh-token.provider";
import { TokenVerificationProvider } from "./verification.provider";
import { UsersService } from "../../users/users.service";
import { EmailDto } from "../dto/email.dto";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,

    private readonly signInProvider: SignInProvider,
    private readonly refreshTokenProvider: RefreshTokenProvider,
    private readonly verifyTokenProvider: TokenVerificationProvider,
    private readonly jwtService: JwtService,
  ) {}

  public async signIn(signInDto: SignInDto) {
    return await this.signInProvider.signIn(signInDto);
  }

  public async refreshToken(refreshTokenDto: RefreshTokenDto) {
    return await this.refreshTokenProvider.refreshToken(refreshTokenDto);
  }

  public async verifyUserEmail(token: string) {
    return await this.verifyTokenProvider.verifyToken(token);
  }

  public async sendVerificationEmail(emailDto: EmailDto) {
    const { email } = emailDto;
    return await this.verifyTokenProvider.sendToken(email);
  }

  public async handleGoogleLogin(user: any) {
    const existingUser = await this.usersService.findOrCreateByGoogle(user);

    const payload = { sub: existingUser.id, email: existingUser.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: existingUser,
    };
  }
}
