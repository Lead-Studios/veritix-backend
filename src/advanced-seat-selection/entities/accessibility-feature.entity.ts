import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { VenueMap } from './venue-map.entity';

export enum AccessibilityFeatureType {
  WHEELCHAIR_ACCESSIBLE = 'wheelchair_accessible',
  COMPANION_SEAT = 'companion_seat',
  ASSISTIVE_LISTENING = 'assistive_listening',
  SIGN_LANGUAGE_INTERPRETATION = 'sign_language_interpretation',
  AUDIO_DESCRIPTION = 'audio_description',
  LARGE_PRINT_PROGRAMS = 'large_print_programs',
  BRAILLE_PROGRAMS = 'braille_programs',
  ACCESSIBLE_PARKING = 'accessible_parking',
  ACCESSIBLE_RESTROOMS = 'accessible_restrooms',
  ELEVATOR_ACCESS = 'elevator_access',
  RAMP_ACCESS = 'ramp_access',
  MOBILITY_DEVICE_STORAGE = 'mobility_device_storage',
  SERVICE_ANIMAL_RELIEF = 'service_animal_relief',
  SENSORY_FRIENDLY = 'sensory_friendly',
}

@Entity('accessibility_features')
@Index(['venueMapId', 'featureType'])
@Index(['isActive', 'isAvailable'])
export class AccessibilityFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  venueMapId: string;

  @ManyToOne(() => VenueMap, (venueMap) => venueMap.accessibilityFeatures, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venueMapId' })
  venueMap: VenueMap;

  @Column({
    type: 'enum',
    enum: AccessibilityFeatureType,
  })
  featureType: AccessibilityFeatureType;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  location: {
    x?: number;
    y?: number;
    zone?: string;
    section?: string;
    floor?: string;
    description?: string;
  };

  @Column({ type: 'int', nullable: true })
  capacity: number; // For features with limited capacity

  @Column({ type: 'int', default: 0 })
  currentUsage: number;

  @Column({ type: 'jsonb', nullable: true })
  specifications: {
    dimensions?: {
      width: number;
      height: number;
      depth?: number;
    };
    equipment?: string[];
    requirements?: string[];
    limitations?: string[];
    instructions?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  contactInfo: {
    department?: string;
    phone?: string;
    email?: string;
    emergencyContact?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  availability: {
    advanceNoticeRequired?: number; // Hours
    bookingRequired?: boolean;
    operatingHours?: {
      start: string;
      end: string;
    };
    restrictions?: string[];
  };

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  additionalCost: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @Column({ type: 'boolean', default: false })
  requiresReservation: boolean;

  @Column({ type: 'int', default: 1 })
  priority: number; // Display priority

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isAtCapacity(): boolean {
    return this.capacity !== null && this.currentUsage >= this.capacity;
  }

  get availableCapacity(): number {
    if (this.capacity === null) return Infinity;
    return Math.max(0, this.capacity - this.currentUsage);
  }

  get utilizationRate(): number {
    if (this.capacity === null || this.capacity === 0) return 0;
    return (this.currentUsage / this.capacity) * 100;
  }
}
