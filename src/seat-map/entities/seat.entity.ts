import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Section } from './section.entity';
import { SeatAssignment } from './seat-assignment.entity';

export enum SeatStatus {
  AVAILABLE = 'available',
  SOLD = 'sold',
  HELD = 'held',
  BLOCKED = 'blocked',
  WHEELCHAIR_ACCESSIBLE = 'wheelchair_accessible',
}

export enum SeatType {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  WHEELCHAIR = 'wheelchair',
  COMPANION = 'companion',
  AISLE = 'aisle',
}

@Entity('seats')
export class Seat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10 })
  row: string;

  @Column({ type: 'varchar', length: 10 })
  number: string;

  @Column({ type: 'varchar', length: 50 })
  label: string; // Display label like "A-1" or "Row 1, Seat 15"

  @Column({ type: 'enum', enum: SeatStatus, default: SeatStatus.AVAILABLE })
  status: SeatStatus;

  @Column({ type: 'enum', enum: SeatType, default: SeatType.STANDARD })
  type: SeatType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number; // Can override section base price

  @Column({ type: 'json', nullable: true })
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };

  @Column({ type: 'timestamp', nullable: true })
  heldUntil?: Date; // For temporary holds during checkout

  @Column({ type: 'varchar', length: 255, nullable: true })
  holdReference?: string; // Session ID or user ID holding the seat

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Section, (section) => section.seats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sectionId' })
  section: Section;

  @Column()
  sectionId: string;

  @OneToOne(() => SeatAssignment, (assignment) => assignment.seat, { nullable: true })
  assignment: SeatAssignment;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed property for full seat identifier
  get fullIdentifier(): string {
    return `${this.row}-${this.number}`;
  }
}
