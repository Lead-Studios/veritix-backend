import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enum/role.enum';
import { ConferenceService } from 'src/conference/providers/conference.service';
import { ROLES_KEY } from 'security/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private conferenceService: ConferenceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user, params } = context.switchToHttp().getRequest();
    
    // Check if user has admin role
    if (user.roles.includes(Role.ADMIN)) {
      return true;
    }

    // Check if user is conference owner
    if (requiredRoles.includes(Role.CONFERENCE_OWNER)) {
      // If we have a conferenceId in the params or body
      const conferenceId = params.conferenceId || context.switchToHttp().getRequest().body.conferenceId;
      
      if (conferenceId) {
        const conference = await this.conferenceService.findOne(conferenceId);
        if (conference && conference.id === user.id) {
          return true;
        }
      }
      
      // If we have a collaborator ID, check if the user is the owner of the associated conference
      if (params.id) {
        const collaborator = await this.conferenceService.findCollaborator(params.id);
        if (collaborator) {
          const conference = await this.conferenceService.findOne(collaborator.id);
          if (conference && conference.id === user.id) {
            return true;
          }
        }
      }
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}