import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Event } from '../../events/entities/event.entity';
import { Vendor } from './vendor.entity';
import { ServiceListing } from './service-listing.entity';
import { ServicePricing } from './service-pricing.entity';
import { BookingPayment } from './booking-payment.entity';
import { Commission } from './commission.entity';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed',
}

export enum BookingPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('service_bookings')
@Index(['status', 'eventDate'])
@Index(['vendorId', 'status'])
@Index(['organizerId', 'status'])
@Index(['eventId'])
export class ServiceBooking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  @Index()
  bookingNumber: string;

  @Column({ type: 'uuid' })
  @Index()
  organizerId: string;

  @Column({ type: 'uuid' })
  @Index()
  vendorId: string;

  @Column({ type: 'uuid' })
  @Index()
  serviceId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  eventId: string;

  @Column({ type: 'uuid', nullable: true })
  pricingId: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({
    type: 'enum',
    enum: BookingPriority,
    default: BookingPriority.MEDIUM,
  })
  priority: BookingPriority;

  @Column({ type: 'timestamp' })
  @Index()
  eventDate: Date;

  @Column({ type: 'time', nullable: true })
  startTime: string;

  @Column({ type: 'time', nullable: true })
  endTime: string;

  @Column({ type: 'int', nullable: true })
  duration: number; // in minutes

  @Column({ type: 'int', nullable: true })
  guestCount: number;

  @Column({ type: 'json', nullable: true })
  eventLocation: {
    venueName?: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    latitude?: number;
    longitude?: number;
    specialInstructions?: string;
  };

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  serviceFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  travelFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'json', nullable: true })
  selectedAddOns: {
    name: string;
    price: number;
    quantity?: number;
  }[];

  @Column({ type: 'json', nullable: true })
  appliedDiscounts: {
    type: string;
    value: number;
    amount: number;
    description?: string;
  }[];

  @Column({ type: 'text', nullable: true })
  specialRequests: string;

  @Column({ type: 'text', nullable: true })
  organizerNotes: string;

  @Column({ type: 'text', nullable: true })
  vendorNotes: string;

  @Column({ type: 'json', nullable: true })
  contactInfo: {
    primaryContact: {
      name: string;
      phone: string;
      email: string;
    };
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };

  @Column({ type: 'json', nullable: true })
  timeline: {
    setupStart?: Date;
    serviceStart: Date;
    serviceEnd: Date;
    cleanupEnd?: Date;
  };

  @Column({ type: 'json', nullable: true })
  requirements: {
    equipment?: string[];
    space?: string[];
    power?: string[];
    other?: string[];
  };

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  cancellationFee: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'organizerId' })
  organizer: User;

  @ManyToOne(() => Vendor, (vendor) => vendor.bookings)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @ManyToOne(() => ServiceListing, (service) => service.bookings)
  @JoinColumn({ name: 'serviceId' })
  service: ServiceListing;

  @ManyToOne(() => Event, { nullable: true })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @ManyToOne(() => ServicePricing, { nullable: true })
  @JoinColumn({ name: 'pricingId' })
  pricing: ServicePricing;

  @OneToMany(() => BookingPayment, (payment) => payment.booking)
  payments: BookingPayment[];

  @OneToOne(() => Commission, (commission) => commission.booking)
  commission: Commission;
}
