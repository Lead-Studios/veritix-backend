import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from '../enums/role.enum';
import { Permission } from './permission.entity';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  @ManyToOne(() => Permission, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permissionId' })
  permission: Permission;

  @Column()
  permissionId: string;
}
