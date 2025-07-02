import { User } from '../entities/user.entity';

export class UserProfileResource {
  static toResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user['name'],
      phone: user['phone'],
      profileImage: user['profileImage'],
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
} 