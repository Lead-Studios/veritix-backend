import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
// import { UserRole } from '../common/enum/user-role-enum';
import { Exclude } from 'class-transformer';
import { Event } from '../../events/entities/event.entity';
import { UserRole } from 'src/auth/common/enum/user-role-enum';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  // =============================
  // PROFILE FIELDS
  // =============================

  @Column({
    nullable: true,
    length: 30,
    comment: 'User phone number',
  })
  phone: string | null;

  @Column({
    nullable: true,
    comment: 'URL of the user avatar image',
  })
  avatarUrl: string | null;

  @Column({
    nullable: true,
    length: 500,
    comment: 'Short user biography (max 500 chars)',
  })
  bio: string | null;

  @Column({
    nullable: true,
    length: 100,
    comment: 'Country of residence',
  })
  country: string | null;

  @Column({
    nullable: true,
    length: 56,
    comment:
      'Stellar public key — used for ticket refunds (starts with G, 56 chars)',
  })
  stellarWalletAddress: string | null;

  // =============================
  // VERIFICATION / RESET
  // =============================

  @Column({ nullable: true })
  @Exclude()
  verificationCode?: string;

  @Column({ type: 'timestamp', nullable: true })
  verificationCodeExpiresAt?: Date;

  @Column({ nullable: true })
  @Exclude()
  passwordResetCode?: string;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetCodeExpiresAt?: Date;

  @Column({ default: false })
  isVerified: boolean;

  // =============================
  // TIMESTAMPS
  // =============================
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // =============================
  // RELATIONS
  // =============================

  // A user can be the organizer of multiple events
  @OneToMany(() => Event, (event) => event.organizer)
  organizedEvents: Event[];
}
