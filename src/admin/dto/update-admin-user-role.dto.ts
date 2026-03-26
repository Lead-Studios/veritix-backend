import { IsIn } from 'class-validator';
import { UserRole } from '../../auth/common/enum/user-role-enum';

export class UpdateAdminUserRoleDto {
  @IsIn([UserRole.ORGANIZER, UserRole.SUBSCRIBER])
  role: UserRole.ORGANIZER | UserRole.SUBSCRIBER;
}
