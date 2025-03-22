import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { SignInDto } from "../dto/create-auth.dto";
import { RefreshTokenDto } from "../dto/refresh-token.dto";
import { SignInProvider } from "./sign-in.provider";
import { RefreshTokenProvider } from "./refresh-token.provider";
import { UsersService } from "src/users/users.service";

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,

    private readonly signInProvider: SignInProvider,
    private readonly refreshTokenProvider: RefreshTokenProvider,
  ) {}

  public async SignIn(signInDto: SignInDto) {
    return await this.signInProvider.SignIn(signInDto);
  }

  public async refreshToken(refreshTokenDto: RefreshTokenDto) {
    return await this.refreshTokenProvider.refreshToken(refreshTokenDto);
  }
}
