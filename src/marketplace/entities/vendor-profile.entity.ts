import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Vendor } from './vendor.entity';

@Entity('vendor_profiles')
export class VendorProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  vendorId: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'json', nullable: true })
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  @Column({ type: 'json', nullable: true })
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };

  @Column({ type: 'json', nullable: true })
  portfolio: {
    images: string[];
    videos: string[];
    documents: string[];
  };

  @Column({ type: 'json', nullable: true })
  certifications: {
    name: string;
    issuer: string;
    issueDate: Date;
    expiryDate?: Date;
    certificateUrl?: string;
  }[];

  @Column({ type: 'json', nullable: true })
  insurance: {
    provider: string;
    policyNumber: string;
    coverage: string;
    expiryDate: Date;
    documentUrl?: string;
  };

  @Column({ type: 'simple-array', nullable: true })
  specialties: string[];

  @Column({ type: 'simple-array', nullable: true })
  languages: string[];

  @Column({ type: 'int', nullable: true })
  yearsOfExperience: number;

  @Column({ type: 'int', nullable: true })
  teamSize: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minimumBookingAmount: number;

  @Column({ type: 'int', nullable: true })
  advanceBookingDays: number;

  @Column({ type: 'text', nullable: true })
  cancellationPolicy: string;

  @Column({ type: 'text', nullable: true })
  refundPolicy: string;

  @Column({ type: 'json', nullable: true })
  emergencyContact: {
    name: string;
    phone: string;
    email: string;
    relationship: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne(() => Vendor, (vendor) => vendor.profile)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;
}
