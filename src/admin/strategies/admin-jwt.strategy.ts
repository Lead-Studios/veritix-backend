/* eslint-disable @typescript-eslint/no-unused-vars */
// admin-jwt.strategy.ts
import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AdminService } from "../providers/admin.service";

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, "admin-jwt") {
  constructor(
    private configService: ConfigService,
    private adminService: AdminService,
  ) {
    const secret = configService.get<string>("jwt.secret");
    // console.log('JWT Secret:', secret); // Debug output to confirm the secret

    if (!secret) {
      throw new Error("JWT secret is not defined in the configuration");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  // async validate(payload: any) {
  //   const admin: any = await this.adminService.findOneById(payload.sub);
  //   // Filter out sensitive data
  //   const { password, refreshToken, resetToken, ...result } = admin;
  //   return result;
  // }

  async validate(payload: any) {
    return { userId: payload.sub, username: payload.username };
  }
}
