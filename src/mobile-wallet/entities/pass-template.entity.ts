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
import { WalletPass, PassType, PassStyle } from './wallet-pass.entity';

export enum TemplateStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

@Entity('pass_templates')
@Index(['organizerId', 'passType'])
@Index(['status', 'isDefault'])
export class PassTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('uuid')
  organizerId: string;

  @Column({
    type: 'enum',
    enum: PassType,
  })
  passType: PassType;

  @Column({
    type: 'enum',
    enum: PassStyle,
    default: PassStyle.EVENT_TICKET,
  })
  passStyle: PassStyle;

  @Column({
    type: 'enum',
    enum: TemplateStatus,
    default: TemplateStatus.DRAFT,
  })
  status: TemplateStatus;

  @Column({ default: false })
  isDefault: boolean;

  @Column()
  passTypeIdentifier: string;

  @Column()
  teamIdentifier: string;

  @Column('text', { nullable: true })
  organizationName: string;

  @Column('simple-json')
  appearance: {
    backgroundColor: string;
    foregroundColor: string;
    labelColor: string;
    logoText?: string;
    stripImage?: string;
    thumbnailImage?: string;
    backgroundImage?: string;
    footerImage?: string;
    iconImage?: string;
  };

  @Column('simple-json')
  fieldTemplates: {
    headerFields: Array<{
      key: string;
      label: string;
      valueTemplate: string;
      textAlignment?: string;
      required?: boolean;
    }>;
    primaryFields: Array<{
      key: string;
      label: string;
      valueTemplate: string;
      textAlignment?: string;
      required?: boolean;
    }>;
    secondaryFields: Array<{
      key: string;
      label: string;
      valueTemplate: string;
      textAlignment?: string;
      required?: boolean;
    }>;
    auxiliaryFields: Array<{
      key: string;
      label: string;
      valueTemplate: string;
      textAlignment?: string;
      required?: boolean;
    }>;
    backFields: Array<{
      key: string;
      label: string;
      valueTemplate: string;
      textAlignment?: string;
      required?: boolean;
    }>;
  };

  @Column('simple-json', { nullable: true })
  barcodeSettings: {
    format: 'PKBarcodeFormatQR' | 'PKBarcodeFormatPDF417' | 'PKBarcodeFormatAztec' | 'PKBarcodeFormatCode128';
    messageTemplate: string;
    altText?: string;
  };

  @Column('simple-json', { nullable: true })
  locationSettings: {
    enabled: boolean;
    defaultLocations: Array<{
      latitude: number;
      longitude: number;
      altitude?: number;
      relevantText?: string;
    }>;
    useEventLocation: boolean;
  };

  @Column('simple-json', { nullable: true })
  beaconSettings: {
    enabled: boolean;
    beacons: Array<{
      proximityUUID: string;
      major?: number;
      minor?: number;
      relevantText?: string;
    }>;
  };

  @Column('simple-json', { nullable: true })
  notificationSettings: {
    relevantDateEnabled: boolean;
    relevantDateOffset: number; // minutes before event
    locationNotifications: boolean;
    beaconNotifications: boolean;
  };

  @Column('simple-json', { nullable: true })
  sharingSettings: {
    allowSharing: boolean;
    shareMessage?: string;
    maxShares?: number;
  };

  @Column('simple-json', { nullable: true })
  webServiceSettings: {
    webServiceURL?: string;
    authenticationToken?: string;
  };

  @Column('simple-json', { nullable: true })
  associatedApps: {
    storeIdentifiers?: number[];
    appLaunchURL?: string;
  };

  @Column('simple-json', { nullable: true })
  customization: {
    allowCustomColors: boolean;
    allowCustomImages: boolean;
    allowCustomFields: boolean;
    maxCustomFields: number;
  };

  @Column('simple-json', { nullable: true })
  validation: {
    requiredFields: string[];
    fieldValidation: Record<string, {
      type: 'string' | 'number' | 'date' | 'email' | 'url';
      minLength?: number;
      maxLength?: number;
      pattern?: string;
    }>;
  };

  @Column('simple-json', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizerId' })
  organizer: User;

  @OneToMany(() => WalletPass, (pass) => pass.template)
  passes: WalletPass[];

  // Virtual properties
  get isActive(): boolean {
    return this.status === TemplateStatus.ACTIVE;
  }

  get passCount(): number {
    return this.passes?.length || 0;
  }

  get hasLocationFeatures(): boolean {
    return this.locationSettings?.enabled || this.beaconSettings?.enabled;
  }

  get supportsSharing(): boolean {
    return this.sharingSettings?.allowSharing || false;
  }
}
