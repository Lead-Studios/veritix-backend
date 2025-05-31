import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../../decorators/roles.decorator";
import { UserRole } from "src/common/enums/users-roles.enum";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  private readonly logger = new Logger(RolesGuard.name);

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from metadata
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      // If no roles are specified, allow access
      this.logger.log("No roles required, access granted");
      return true;
    }

    // Get user from request
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    this.logger.log(
      `Checking roles for user: ${JSON.stringify(user, null, 2)}`,
    );

    if (!user || !user.role) {
      throw new ForbiddenException("Access denied: No role assigned");
    }

    // Check if the user has at least one required role
    const hasRequiredRoles = requiredRoles.includes(user.role);
    if (!hasRequiredRoles) {
      throw new ForbiddenException("Access denied: Insufficient permissions");
    }

    return hasRequiredRoles;
  }
}
