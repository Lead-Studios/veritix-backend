import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum PreferenceType {
  CATEGORY = 'category',
  GENRE = 'genre',
  LOCATION = 'location',
  PRICE_RANGE = 'price_range',
  TIME_PREFERENCE = 'time_preference',
  VENUE_TYPE = 'venue_type',
  EVENT_SIZE = 'event_size',
}

export enum PreferenceSource {
  EXPLICIT = 'explicit',
  IMPLICIT = 'implicit',
  INFERRED = 'inferred',
  SOCIAL = 'social',
}

@Entity()
@Index(['userId', 'preferenceType'])
@Index(['preferenceType', 'weight'])
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  user: User;

  @Column({
    type: 'enum',
    enum: PreferenceType,
  })
  preferenceType: PreferenceType;

  @Column()
  preferenceValue: string;

  @Column({ type: 'float', default: 1.0 })
  weight: number;

  @Column({ type: 'float', default: 1.0 })
  confidence: number;

  @Column({
    type: 'enum',
    enum: PreferenceSource,
    default: PreferenceSource.IMPLICIT,
  })
  source: PreferenceSource;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'int', default: 1 })
  frequency: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUsed: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  ownerId: string;
}
