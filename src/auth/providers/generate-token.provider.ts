import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigType } from "@nestjs/config";
import jwtConfig from "config/jwt.config";
import { User } from "src/users/entities/user.entity";

@Injectable()
export class GenerateTokenProvider {
  constructor(
    private readonly jwtService: JwtService,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  public async SignToken<T>(userId: number, expiresIn: string | number, payload?: T) {
    return await this.jwtService.signAsync(
      {
        sub: userId,
        ...payload,
      },
      {
        secret: this.jwtConfiguration.secret,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
        expiresIn,
      },
    );
  }

  public async generateTokens(user: User) {
    const [access_token, refresh_token] = await Promise.all([
      this.SignToken(user.id, this.jwtConfiguration.expiresIn, {
        userId: user.id,
        email: user.email,
      }),
      this.SignToken(user.id, this.jwtConfiguration.refreshExpiresIn, {
        userId: user.id
      }),
    ]);

    return { access_token, refresh_token };
  }
}
