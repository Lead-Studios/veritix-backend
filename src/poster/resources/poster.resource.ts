import { Poster } from '../entities/poster.entity';

export class PosterResource {
  static toResponse(poster: Poster) {
    return {
      id: poster.id,
      image: poster.image,
      description: poster.description,
      event: poster.event ? { id: poster.event.id, name: poster.event.name } : null,
      createdAt: poster.createdAt,
      updatedAt: poster.updatedAt,
    };
  }

  static toArray(posters: Poster[]) {
    return posters.map(PosterResource.toResponse);
  }
} 