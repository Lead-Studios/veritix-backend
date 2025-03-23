import { UserRole } from '../../src/common/enums/users-roles.enum';
export declare const ROLES_KEY = "roles";
export declare const RoleDecorator: (roles_0: UserRole, ...roles: UserRole[]) => import("@nestjs/common").CustomDecorator<string>;
