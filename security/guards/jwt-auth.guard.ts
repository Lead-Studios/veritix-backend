import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Logger } from "@nestjs/common";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: any, user: TUser): TUser {
    this.logger.log("Handling request in JwtAuthGuard");
    if (err) {
      this.logger.error(
        `Error during authentication: ${err.message}: ${err.stack}`,
      );
    }

    if (err || !user) {
      throw new UnauthorizedException("Invalid token or user not found");
    }
    this.logger.log(`User authenticated: ${JSON.stringify(user, null, 2)}`);
    return user;
  }
}
