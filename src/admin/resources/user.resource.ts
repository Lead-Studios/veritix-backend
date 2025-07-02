import { User } from '../../user/entities/user.entity';

export class UserResource {
  static toResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user['name'],
      phone: user['phone'],
      profileImage: user['profileImage'],
      isEmailVerified: user.isEmailVerified,
      roles: user.roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toArray(users: User[]) {
    return users.map(UserResource.toResponse);
  }
} 