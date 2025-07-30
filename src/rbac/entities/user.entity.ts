import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { Role } from './role.entity'; // Import the new Role entity

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

  @ManyToMany(() => Role, role => role.users, { eager: true }) // Many-to-many relationship with Role entity
  @JoinTable({ name: 'user_roles' }) // Custom join table name
  roles: Role[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

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
