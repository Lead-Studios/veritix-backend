import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { EnhancedSeat } from './enhanced-seat.entity';
import { VipSection } from './vip-section.entity';
import { AccessibilityFeature } from './accessibility-feature.entity';

export enum VenueMapStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum VenueType {
  THEATER = 'theater',
  STADIUM = 'stadium',
  ARENA = 'arena',
  CONCERT_HALL = 'concert_hall',
  CONFERENCE_CENTER = 'conference_center',
  OUTDOOR = 'outdoor',
  CUSTOM = 'custom',
}

@Entity('venue_maps')
@Index(['eventId', 'status'])
export class VenueMap {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column('uuid')
  eventId: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({
    type: 'enum',
    enum: VenueType,
    default: VenueType.CUSTOM,
  })
  venueType: VenueType;

  @Column({
    type: 'enum',
    enum: VenueMapStatus,
    default: VenueMapStatus.DRAFT,
  })
  status: VenueMapStatus;

  @Column({ type: 'text' })
  svgData: string; // SVG markup for the venue layout

  @Column({ type: 'jsonb' })
  mapConfiguration: {
    width: number;
    height: number;
    viewBox: string;
    scale: number;
    centerPoint: { x: number; y: number };
    gridSize?: number;
    snapToGrid?: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  styling: {
    backgroundColor?: string;
    borderColor?: string;
    seatColors?: {
      available: string;
      selected: string;
      sold: string;
      held: string;
      blocked: string;
      wheelchair: string;
      vip: string;
    };
    sectionColors?: Record<string, string>;
    fonts?: {
      family: string;
      size: number;
      color: string;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  interactionSettings: {
    allowSeatSelection: boolean;
    allowMultiSelect: boolean;
    maxSeatsPerSelection: number;
    showPricing: boolean;
    showSeatLabels: boolean;
    enableZoom: boolean;
    enablePan: boolean;
    mobileOptimized: boolean;
  };

  @Column({ type: 'int', default: 0 })
  totalSeats: number;

  @Column({ type: 'int', default: 0 })
  availableSeats: number;

  @Column({ type: 'int', default: 0 })
  soldSeats: number;

  @Column({ type: 'int', default: 0 })
  heldSeats: number;

  @Column({ type: 'int', default: 0 })
  wheelchairAccessibleSeats: number;

  @Column({ type: 'int', default: 0 })
  vipSeats: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxPrice: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    venue: {
      name: string;
      address?: string;
      capacity: number;
      type: string;
    };
    sections: Array<{
      id: string;
      name: string;
      capacity: number;
      basePrice: number;
    }>;
    accessibility: {
      wheelchairSeats: number;
      companionSeats: number;
      assistiveListening: boolean;
      signLanguage: boolean;
    };
    amenities?: string[];
    notes?: string;
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @OneToMany(() => EnhancedSeat, (seat) => seat.venueMap)
  seats: EnhancedSeat[];

  @OneToMany(() => VipSection, (vipSection) => vipSection.venueMap)
  vipSections: VipSection[];

  @OneToMany(() => AccessibilityFeature, (feature) => feature.venueMap)
  accessibilityFeatures: AccessibilityFeature[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get occupancyRate(): number {
    return this.totalSeats > 0 ? (this.soldSeats / this.totalSeats) * 100 : 0;
  }

  get availabilityRate(): number {
    return this.totalSeats > 0 ? (this.availableSeats / this.totalSeats) * 100 : 0;
  }

  get isPublished(): boolean {
    return this.status === VenueMapStatus.ACTIVE && this.publishedAt !== null;
  }
}
