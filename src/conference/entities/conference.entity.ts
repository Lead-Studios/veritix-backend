import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('conferences')
export class Conference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conference_name' })
  conferenceName: string;

  @Column({ name: 'conference_category' })
  conferenceCategory: string;

  @Column({ name: 'conference_date', type: 'timestamp' })
  conferenceDate: Date;

  @Column({ name: 'conference_closing_date', type: 'timestamp' })
  conferenceClosingDate: Date;

  @Column({ name: 'conference_description', type: 'text' })
  conferenceDescription: string;

  @Column({ name: 'conference_image' })
  conferenceImage: string;

  // Location details
  @Column()
  country: string;

  @Column()
  state: string;

  @Column()
  street: string;

  @Column({ name: 'local_government' })
  localGovernment: string;

  @Column({ nullable: true })
  direction: string;

  @Column({ name: 'hide_location', default: false })
  hideLocation: boolean;

  // Additional details
  @Column({ name: 'coming_soon', default: false })
  comingSoon: boolean;

  @Column({ name: 'transaction_charge', default: false })
  transactionCharge: boolean;

  // Bank details
  @Column({ name: 'bank_name' })
  bankName: string;

  @Column({ name: 'bank_account_number' })
  bankAccountNumber: string;

  @Column({ name: 'account_name' })
  accountName: string;

  // Social media (optional)
  @Column({ nullable: true })
  facebook: string;

  @Column({ nullable: true })
  twitter: string;

  @Column({ nullable: true })
  instagram: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}