/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigType } from "@nestjs/config";
import { GenerateTokenProvider } from "./generate-token.provider";
import jwtConfig from "config/jwt.config";
import { UsersService } from "src/users/users.service";
import { RefreshTokenDto } from "../dto/refresh-token.dto";

@Injectable()
export class RefreshTokenProvider {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly userServices: UsersService,
    private readonly jwtService: JwtService,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,

    private readonly generateTokensProvider: GenerateTokenProvider,
  ) {}

  public async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const { sub } = await this.jwtService.verifyAsync(
        refreshTokenDto.refreshToken,
        {
          secret: this.jwtConfiguration.secret,
          audience: this.jwtConfiguration.audience,
          issuer: this.jwtConfiguration.issuer,
        },
      );

      const user = await this.userServices.findOneById(sub);

      const access_token = await this.generateTokensProvider.SignToken(
        user.id,
        this.jwtConfiguration.expiresIn,
        { email: user.email },
      );

      return { access_token, refresh_token: refreshTokenDto.refreshToken };
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new UnauthorizedException("Refresh token has expired");
      }

      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }
}
