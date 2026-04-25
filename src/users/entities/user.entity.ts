import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';

@Entity('users')
@Index(['isVerified', 'deletedAt'])
@Index(['role'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
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
  currentRefreshTokenHash: string | null;

  @Column({ nullable: true })
  passwordResetCode: string | null;

  @Column({ nullable: true })
  passwordResetCodeExpiresAt: Date | null;

  @Column({ nullable: true })
  organizationName: string;

  @Column({ nullable: true })
  organizationWebsite: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @Column({ nullable: true })
  stellarWalletAddress: string;

  @Column({ nullable: true })
  avatarUrl: string;
}
