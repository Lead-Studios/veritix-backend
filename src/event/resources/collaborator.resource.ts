import { Collaborator } from '../entities/collaborator.entity';

export class CollaboratorResource {
  static toResponse(collaborator: Collaborator) {
    return {
      id: collaborator.id,
      name: collaborator.name,
      image: collaborator.image,
      email: collaborator.email,
      eventId: collaborator.event?.id || null,
    };
  }

  static toArray(collaborators: Collaborator[]) {
    return collaborators.map(this.toResponse);
  }
}
