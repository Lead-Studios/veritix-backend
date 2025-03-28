import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common"
import type { Reflector } from "@nestjs/core"
import type { UserRole } from "../../users/entities/user.entity"
import { ROLES_KEY } from "../decorators/roles.decorator"

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles) {
      return true
    }

    const { user } = context.switchToHttp().getRequest()
    return requiredRoles.some((role) => user.role === role)
  }
}

