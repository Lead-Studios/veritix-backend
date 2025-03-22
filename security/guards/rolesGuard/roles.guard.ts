import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../../decorators/roles.decorator";
import { UserRole } from "src/common/enums/users-roles.enum";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from metadata
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Get user from request
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const user = request.user; // Ensure user is attached to request (e.g., via JWT auth)
    console.log("User from request:", user);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!user || !user.role) {
      throw new ForbiddenException("Access denied: No role assigned");
    }

    // Check if the user has at least one required role
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const hasRequiredRoles = requiredRoles.includes(user.role);
    if (!hasRequiredRoles) {
      throw new ForbiddenException("Access denied:  role not found");
    }

    return hasRequiredRoles;
  }
}
