import { Injectable, type CanActivate, type ExecutionContext, ForbiddenException } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { Role } from "../enums/role.enum"
import { ROLES_KEY } from "../decorators/roles.decorator"

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles) {
      return true
    }

    const { user } = context.switchToHttp().getRequest()

    if (!user) {
      throw new ForbiddenException("User not authenticated")
    }

    if (!user.roles || user.roles.length === 0) {
      throw new ForbiddenException("User has no assigned roles")
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role))

    if (!hasRole) {
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(", ")}`)
    }

    return true
  }
}
