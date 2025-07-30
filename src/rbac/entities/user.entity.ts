
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../rbac/enums/role.enum';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm';


@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    type: 'enum',
    enum: Role,
    array: true,
    default: [Role.USER],
  })
  @ManyToMany(() => Role, role => role.users, { eager: true }) // Many-to-many relationship with Role entity
  @JoinTable({ name: 'user_roles' }) // Custom join table name
  roles: Role[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  hasRole(role: Role): boolean {
    return this.roles.includes(role);
  }

  hasAnyRole(roles: Role[]): boolean {
    return roles.some((role) => this.roles.includes(role));
  }

  hasAllRoles(roles: Role[]): boolean {
    return roles.every((role) => this.roles.includes(role));
  }

  addRole(role: Role): void {
    if (!this.roles.includes(role)) {
      this.roles.push(role);
    }
  }

  removeRole(role: Role): void {
    this.roles = this.roles.filter((r) => r !== role);
  }

  isAdmin(): boolean {
    return this.hasRole(Role.ADMIN);
  }

  isOrganizer(): boolean {
    return this.hasRole(Role.ORGANIZER);
  }

  isUser(): boolean {
    return this.hasRole(Role.USER);
  // Helper methods (will need to be updated to check permissions via roles)
  async hasPermission(permissionName: string): Promise<boolean> {
    if (!this.roles || this.roles.length === 0) {
      return false;
    }
    for (const role of this.roles) {
      if (role.rolePermissions) {
        for (const rp of role.rolePermissions) {
          if (rp.permission.name === permissionName) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
