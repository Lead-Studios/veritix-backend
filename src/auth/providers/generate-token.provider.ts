import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigType } from "@nestjs/config";
import jwtConfig from "src/config/jwt.config";
import { User } from "src/users/entities/user.entity";

@Injectable()
export class GenerateTokenProvider {
  constructor(
    private readonly jwtService: JwtService,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  public async SignToken<T>(
    userId: number,
    expiresIn: string | number,
    payload?: T,
  ) {
    return await this.jwtService.signAsync({
      ...payload,
      expiresIn,
    });
  }

  public async generateTokens(user: User) {
    const [access_token, refresh_token] = await Promise.all([
      this.SignToken(user.id, this.jwtConfiguration.expiresIn, {
        userId: user.id,
        email: user.email,
        role: user.role
      }),
      this.SignToken(user.id, this.jwtConfiguration.refreshExpiresIn, {
        userId: user.id,
      }),
    ]);

    return { access_token, refresh_token };
  }

  public async generateVerificationToken(user: User) {
    const verification_token = await this.SignToken(
      user.id,
      this.jwtConfiguration.verificationExpiresIn,
      {
        userId: user.id,
        email: user.email,
      },
    );

    return verification_token;
  }
}
