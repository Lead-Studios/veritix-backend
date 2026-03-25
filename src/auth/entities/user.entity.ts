import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../common/enum/user-role-enum';
import { Exclude } from 'class-transformer';
import { Ticket } from '../../tickets/entities/ticket.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  fullName: string;

  @Column()
  @Exclude()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.SUBSCRIBER,
  })
  role: UserRole;

  @Column({ nullable: true })
  verificationCode?: string;

  @CreateDateColumn()
  verificationCodeExpiresAt?: Date;

  @Column({ nullable: true })
  passwordResetCode?: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: false })
  isSuspended: boolean;

  @Column({ type: 'text', nullable: true })
  suspensionReason?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  suspendedAt?: Date | null;

  @Column({ type: 'int', default: 0 })
  tokenVersion: number;

  @CreateDateColumn()
  passwordResetCodeExpiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Ticket, (t) => t.owner)
  tickets: Ticket[];
}
