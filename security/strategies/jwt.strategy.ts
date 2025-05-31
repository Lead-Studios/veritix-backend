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
      secretOrKey: configService.get<string>("JWT_SECRET"),
    });
  }
  private readonly logger = new Logger(JwtStrategy.name);

  async validate(payload: any) {
    this.logger.log("Validating JWT token");
    this.logger.debug(`Payload: ${JSON.stringify(payload, null, 2)}`);

    if (!payload) {
      throw new UnauthorizedException("Invalid token");
    }

    const userId: string = payload.userId;
    if (!userId || typeof userId !== "string") {
      this.logger.error(
        `Invalid userId in payload: ${JSON.stringify(payload, null, 2)}`,
      );
      throw new UnauthorizedException("Invalid userId");
    }

    return {
      userId: userId,
      email: payload.email,
      role: payload.role,
    };
  };
}
