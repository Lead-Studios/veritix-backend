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
import { User } from '../../users/entities/user.entity';
import { Event } from '../../events/entities/event.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { PassAnalytics } from './pass-analytics.entity';
import { PassUpdate } from './pass-update.entity';

export enum PassType {
  APPLE_WALLET = 'apple_wallet',
  GOOGLE_PAY = 'google_pay',
}

export enum PassStatus {
  CREATED = 'created',
  GENERATED = 'generated',
  DELIVERED = 'delivered',
  INSTALLED = 'installed',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  ERROR = 'error',
}

export enum PassStyle {
  EVENT_TICKET = 'eventTicket',
  BOARDING_PASS = 'boardingPass',
  COUPON = 'coupon',
  STORE_CARD = 'storeCard',
  GENERIC = 'generic',
}

@Entity('wallet_passes')
@Index(['userId', 'eventId'])
@Index(['ticketId'], { unique: true })
@Index(['passTypeIdentifier', 'serialNumber'], { unique: true })
@Index(['status', 'expiresAt'])
export class WalletPass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  eventId: string;

  @Column('uuid')
  ticketId: string;

  @Column({
    type: 'enum',
    enum: PassType,
  })
  passType: PassType;

  @Column({
    type: 'enum',
    enum: PassStatus,
    default: PassStatus.CREATED,
  })
  status: PassStatus;

  @Column({
    type: 'enum',
    enum: PassStyle,
    default: PassStyle.EVENT_TICKET,
  })
  passStyle: PassStyle;

  @Column({ unique: true })
  passTypeIdentifier: string;

  @Column({ unique: true })
  serialNumber: string;

  @Column({ nullable: true })
  authenticationToken: string;

  @Column('text', { nullable: true })
  passData: string; // JSON string containing pass content

  @Column('text', { nullable: true })
  passUrl: string; // URL to download the pass

  @Column('text', { nullable: true })
  qrCodeData: string;

  @Column('text', { nullable: true })
  barcodeMessage: string;

  @Column('simple-json', { nullable: true })
  locations: Array<{
    latitude: number;
    longitude: number;
    altitude?: number;
    relevantText?: string;
  }>;

  @Column('simple-json', { nullable: true })
  beacons: Array<{
    proximityUUID: string;
    major?: number;
    minor?: number;
    relevantText?: string;
  }>;

  @Column('timestamp', { nullable: true })
  relevantDate: Date;

  @Column('timestamp', { nullable: true })
  expiresAt: Date;

  @Column('simple-json', { nullable: true })
  passFields: {
    headerFields?: Array<{
      key: string;
      label: string;
      value: string;
      textAlignment?: string;
    }>;
    primaryFields?: Array<{
      key: string;
      label: string;
      value: string;
      textAlignment?: string;
    }>;
    secondaryFields?: Array<{
      key: string;
      label: string;
      value: string;
      textAlignment?: string;
    }>;
    auxiliaryFields?: Array<{
      key: string;
      label: string;
      value: string;
      textAlignment?: string;
    }>;
    backFields?: Array<{
      key: string;
      label: string;
      value: string;
      textAlignment?: string;
    }>;
  };

  @Column('simple-json', { nullable: true })
  appearance: {
    backgroundColor?: string;
    foregroundColor?: string;
    labelColor?: string;
    logoText?: string;
    stripImage?: string;
    thumbnailImage?: string;
    backgroundImage?: string;
    footerImage?: string;
    iconImage?: string;
  };

  @Column('simple-json', { nullable: true })
  webServiceURL: string;

  @Column('simple-json', { nullable: true })
  associatedStoreIdentifiers: number[];

  @Column('simple-json', { nullable: true })
  userInfo: any;

  @Column('timestamp', { nullable: true })
  lastUpdated: Date;

  @Column('timestamp', { nullable: true })
  installedAt: Date;

  @Column('timestamp', { nullable: true })
  lastViewedAt: Date;

  @Column('simple-json', { nullable: true })
  sharingInfo: {
    sharedWith: string[];
    shareToken?: string;
    shareExpiresAt?: Date;
    allowSharing: boolean;
  };

  @Column('simple-json', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @OneToMany(() => PassAnalytics, (analytics) => analytics.walletPass)
  analytics: PassAnalytics[];

  @OneToMany(() => PassUpdate, (update) => update.walletPass)
  updates: PassUpdate[];

  // Virtual properties
  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get isActive(): boolean {
    return this.status === PassStatus.ACTIVE && !this.isExpired;
  }

  get downloadUrl(): string {
    return `/api/mobile-wallet/passes/${this.id}/download`;
  }

  get installUrl(): string {
    if (this.passType === PassType.APPLE_WALLET) {
      return `https://wallet.apple.com/passes/${this.passTypeIdentifier}/${this.serialNumber}`;
    }
    return this.passUrl || '';
  }

  get isShared(): boolean {
    return this.sharingInfo?.sharedWith?.length > 0;
  }

  get daysUntilExpiry(): number {
    if (!this.expiresAt) return -1;
    const now = new Date();
    const diffTime = this.expiresAt.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
