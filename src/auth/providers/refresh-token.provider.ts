import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigType } from "@nestjs/config";
import { GenerateTokenProvider } from "../../common/utils/generate-token.provider";
import jwtConfig from "src/config/jwt.config";
import { UsersService } from "src/users/users.service";
import { RefreshTokenDto } from "../dto/refresh-token.dto";
import * as bcrypt from "bcrypt";

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
      const { sub, tokenVersion } = await this.jwtService.verifyAsync(
        refreshTokenDto.refreshToken,
        {
          secret: this.jwtConfiguration.secret,
          audience: this.jwtConfiguration.audience,
          issuer: this.jwtConfiguration.issuer,
        },
      );

      const user = await this.userServices.findOneById(sub);

      // Check if the refresh token hash matches
      if (user.currentRefreshTokenHash) {
        const isMatch = await bcrypt.compare(
          refreshTokenDto.refreshToken,
          user.currentRefreshTokenHash,
        );

        if (!isMatch) {
          // Suspicious activity: token reuse detected
          await this.userServices['userRepository'].update(user.id, {
            tokenVersion: user.tokenVersion + 1,
          });
          throw new UnauthorizedException("Suspicious activity detected");
        }
      }

      // Generate new tokens with updated tokenVersion
      const userWithUpdatedVersion = {
        ...user,
        tokenVersion: user.tokenVersion,
      };
      const tokens = await this.generateTokensProvider.generateTokens(
        userWithUpdatedVersion as any,
      );

      // Store new refresh token hash
      const refreshTokenHash = await bcrypt.hash(tokens.refresh_token, 10);
      await this.userServices['userRepository'].update(user.id, {
        currentRefreshTokenHash: refreshTokenHash,
      });

      return { access_token: tokens.access_token, refresh_token: tokens.refresh_token };
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new UnauthorizedException("Refresh token has expired");
      }

      if (error.message === "Suspicious activity detected") {
        throw error;
      }

      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }
}
