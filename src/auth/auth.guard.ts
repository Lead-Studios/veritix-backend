import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Example: check for user in request (replace with real auth logic)
    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return true;
  }
}
