import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { CollaboratorService } from '../collaborators.service';

@Injectable()
export class MaxCollaboratorsGuard implements CanActivate {
  constructor(private readonly collaboratorService: CollaboratorService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const conferenceId = request.body.conferenceId;

    if (!conferenceId) {
      return true; // Skip validation if no conferenceId is provided
    }

    const count = await this.collaboratorService.countByConferenceId(conferenceId);
    
    if (count >= 5) {
      throw new BadRequestException('Conference already has the maximum of 5 collaborators');
    }

    return true;
  }
}