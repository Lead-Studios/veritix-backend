import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Vendor } from './vendor.entity';
import { ServiceListing } from './service-listing.entity';
import { ServiceBooking } from './service-booking.entity';

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
}

@Entity('vendor_reviews')
@Index(['vendorId', 'status'])
@Index(['serviceId', 'status'])
@Index(['rating', 'createdAt'])
export class VendorReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  reviewerId: string;

  @Column({ type: 'uuid' })
  @Index()
  vendorId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  serviceId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  bookingId: string;

  @Column({ type: 'int', width: 1 })
  @Index()
  rating: number; // 1-5 stars

  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string;

  @Column({ type: 'text' })
  comment: string;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
  })
  status: ReviewStatus;

  @Column({ type: 'json', nullable: true })
  ratings: {
    communication?: number;
    quality?: number;
    timeliness?: number;
    professionalism?: number;
    value?: number;
  };

  @Column({ type: 'json', nullable: true })
  images: string[];

  @Column({ type: 'boolean', default: false })
  isVerifiedPurchase: boolean;

  @Column({ type: 'boolean', default: false })
  isRecommended: boolean;

  @Column({ type: 'int', default: 0 })
  helpfulCount: number;

  @Column({ type: 'int', default: 0 })
  reportCount: number;

  @Column({ type: 'text', nullable: true })
  vendorResponse: string;

  @Column({ type: 'timestamp', nullable: true })
  vendorResponseAt: Date;

  @Column({ type: 'text', nullable: true })
  moderatorNotes: string;

  @Column({ type: 'timestamp', nullable: true })
  moderatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewerId' })
  reviewer: User;

  @ManyToOne(() => Vendor, (vendor) => vendor.reviews)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @ManyToOne(() => ServiceListing, (service) => service.reviews, {
    nullable: true,
  })
  @JoinColumn({ name: 'serviceId' })
  service: ServiceListing;

  @ManyToOne(() => ServiceBooking, { nullable: true })
  @JoinColumn({ name: 'bookingId' })
  booking: ServiceBooking;
}
