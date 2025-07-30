import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { HAS_PERMISSION_KEY } from '../decorators/has-permission.decorator';
import { User } from '../entities/user.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(HAS_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true; // No permissions specified, allow access
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.roles) {
      return false; // No user or roles, deny access
    }

    // Check if the user has all the required permissions
    return requiredPermissions.every(permission => user.hasPermission(permission));
  }
}
