import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  fullName: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.SUBSCRIBER,
  })
  role: UserRole;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: 0 })
  tokenVersion: number;

  @Column({ nullable: true })
  currentRefreshTokenHash: string;

  @Column({ nullable: true })
  passwordResetCode: string;

  @Column({ nullable: true })
  passwordResetCodeExpiresAt: Date;

  @Column({ nullable: true })
  organizationName: string;

  @Column({ nullable: true })
  organizationWebsite: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
