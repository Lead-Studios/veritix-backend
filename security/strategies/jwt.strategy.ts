import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("jwt.secret"),
      
    });
  }
  private readonly logger = new Logger(JwtStrategy.name);

  async validate(payload: any) {
    const userId = Number(payload.sub || payload.userId);
    if (!userId) {
      throw new UnauthorizedException("Invalid token");
    }
    this.logger.log(`User ID from token: ${userId}`);
    // Check if userId is a valid number
    if (isNaN(userId) || !Number.isInteger(userId) || userId <= 0) {
      this.logger.error("Invalid userId:", userId);
      throw new UnauthorizedException("Invalid userId");
    }

    return {
      userId: userId,
      email: payload.email,
      role: payload.role,
    };
  };
}
