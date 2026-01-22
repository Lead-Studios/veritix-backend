/**
 * Users Module Barrel Export
 *
 * Re-exports all public users module components for easy importing.
 */

// Module
export { UsersModule } from './users.module';

// Service
export { UsersService } from './users.service';

// Enums (runtime values)
export { UserRole } from './interfaces/user.interface';

// Types (use export type for interfaces)
export type {
  User,
  UserProfile,
  CreateUserData,
  UpdateUserData,
} from './interfaces/user.interface';
