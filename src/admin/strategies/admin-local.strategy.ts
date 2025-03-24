/* eslint-disable @typescript-eslint/no-unused-vars */
// admin-local.strategy.ts
import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AdminAuthService } from "../providers/admin-auth.services";

@Injectable()
export class AdminLocalStrategy extends PassportStrategy(
  Strategy,
  "admin-local",
) {
  constructor(private adminAuthService: AdminAuthService) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({ usernameField: "email" });
  }

  async validate(email: string, password: string): Promise<any> {
    const admin = await this.adminAuthService.validateAdmin(email, password);
    if (!admin) {
      throw new UnauthorizedException();
    }

    // Remove sensitive data
    const { password: _, refreshToken, resetToken, ...result } = admin;
    return result;
  }
}
