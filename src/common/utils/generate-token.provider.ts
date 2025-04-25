import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigType } from "@nestjs/config";
import jwtConfig from "../../config/jwt.config";
import { User } from "../../users/entities/user.entity";
import { Admin } from "../../admin/entities/admin.entity";

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

  public async generateTokens(user: User | Admin) {
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

  public async generateVerificationToken(user: User | Admin) {
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

  public async generatePasswordResetToken(user: User | Admin) {
    const reset_token = await this.jwtService.signAsync(
      {
        email: user.email,
      },
      {
        secret: this.jwtConfiguration.resetPasswordSecret,
        expiresIn: this.jwtConfiguration.passwordExpiresIn,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
      }
    );

    return reset_token;
  }
}
