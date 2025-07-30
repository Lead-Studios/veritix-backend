import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { RolePermission } from './role-permission.entity';
import { User } from '../../user/entities/user.entity'; // Import User entity

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true }) // e.g., 'admin', 'organizer', 'user'
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => RolePermission, rolePermission => rolePermission.role, { cascade: true })
  rolePermissions: RolePermission[];

  @ManyToMany(() => User, user => user.roles)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
