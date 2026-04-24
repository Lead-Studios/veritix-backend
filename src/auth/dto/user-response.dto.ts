import { UserRole } from '../../users/enums/user-role.enum';

export class UserResponseDto {
  id: string;

  email: string;

  fullName: string;

  role: UserRole;

  isVerified: boolean;

  organizationName?: string;

  createdAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
