import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('purchase_locations')
@Index(['eventId', 'country', 'city'])
@Index(['eventId', 'region'])
@Index(['eventId', 'createdAt'])
export class PurchaseLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  eventId: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  country: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  state: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  region: string; // Normalized region (e.g., "North America", "Europe")

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ type: 'int', default: 0 })
  totalPurchases: number;

  @Column({ type: 'int', default: 0 })
  totalTickets: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  averageTicketPrice: number;

  @Column({ type: 'jsonb', nullable: true })
  purchaseDates: string[]; // Array of purchase dates for this location

  @Column({ type: 'jsonb', nullable: true })
  ticketTypes: Record<string, number>; // Breakdown by ticket type

  @Column({ type: 'jsonb', nullable: true })
  trafficSources: Record<string, number>; // Breakdown by traffic source

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 