import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Vendor } from './vendor.entity';
import { ServiceCategory } from './service-category.entity';
import { ServicePricing } from './service-pricing.entity';
import { ServiceBooking } from './service-booking.entity';
import { VendorReview } from './vendor-review.entity';

export enum ServiceStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum ServiceType {
  CATERING = 'catering',
  PHOTOGRAPHY = 'photography',
  VIDEOGRAPHY = 'videography',
  MUSIC_DJ = 'music_dj',
  LIVE_BAND = 'live_band',
  DECORATION = 'decoration',
  LIGHTING = 'lighting',
  SOUND_SYSTEM = 'sound_system',
  VENUE_SETUP = 'venue_setup',
  SECURITY = 'security',
  TRANSPORTATION = 'transportation',
  ENTERTAINMENT = 'entertainment',
  FLOWERS = 'flowers',
  EQUIPMENT_RENTAL = 'equipment_rental',
  PLANNING = 'planning',
  OTHER = 'other',
}

@Entity('service_listings')
@Index(['status', 'isActive'])
@Index(['vendorId', 'status'])
@Index(['categoryId'])
export class ServiceListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  vendorId: string;

  @Column({ type: 'uuid' })
  @Index()
  categoryId: string;

  @Column({ type: 'varchar', length: 200 })
  @Index()
  title: string;

  @Column({ type: 'varchar', length: 300, unique: true })
  @Index()
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ServiceType,
  })
  serviceType: ServiceType;

  @Column({
    type: 'enum',
    enum: ServiceStatus,
    default: ServiceStatus.DRAFT,
  })
  status: ServiceStatus;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'json' })
  images: string[];

  @Column({ type: 'json', nullable: true })
  videos: string[];

  @Column({ type: 'json', nullable: true })
  documents: string[];

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ type: 'int', default: 0 })
  totalReviews: number;

  @Column({ type: 'int', default: 0 })
  totalBookings: number;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  favoriteCount: number;

  @Column({ type: 'json', nullable: true })
  serviceDetails: {
    duration?: string;
    capacity?: {
      min: number;
      max: number;
    };
    setupTime?: string;
    cleanupTime?: string;
    travelRadius?: number;
    equipmentIncluded?: string[];
    additionalServices?: string[];
    requirements?: string[];
    restrictions?: string[];
  };

  @Column({ type: 'json', nullable: true })
  availability: {
    daysOfWeek: string[];
    timeSlots: {
      start: string;
      end: string;
    }[];
    blackoutDates: Date[];
    advanceBookingDays: number;
    minimumNotice: number;
  };

  @Column({ type: 'json', nullable: true })
  location: {
    serviceAreas: string[];
    travelFee?: number;
    maxTravelDistance?: number;
    baseLocation?: {
      address: string;
      city: string;
      state: string;
      zipCode: string;
      latitude?: number;
      longitude?: number;
    };
  };

  @Column({ type: 'json', nullable: true })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Vendor, (vendor) => vendor.services)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @ManyToOne(() => ServiceCategory, (category) => category.services)
  @JoinColumn({ name: 'categoryId' })
  category: ServiceCategory;

  @OneToMany(() => ServicePricing, (pricing) => pricing.service)
  pricing: ServicePricing[];

  @OneToMany(() => ServiceBooking, (booking) => booking.service)
  bookings: ServiceBooking[];

  @OneToMany(() => VendorReview, (review) => review.service)
  reviews: VendorReview[];
}
