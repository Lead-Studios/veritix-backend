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
import { EmailCampaign } from './email-campaign.entity';
import { UserSegment } from './user-segment.entity';

@Entity('campaign_segments')
@Index(['campaignId', 'segmentId'])
export class CampaignSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  campaignId: string;

  @Column({ type: 'uuid' })
  @Index()
  segmentId: string;

  @Column({ type: 'boolean', default: true })
  isIncluded: boolean; // true for include, false for exclude

  @Column({ type: 'int', default: 0 })
  estimatedSize: number;

  @Column({ type: 'int', default: 0 })
  actualSize: number;

  @Column({ type: 'timestamp', nullable: true })
  lastCalculatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => EmailCampaign, (campaign) => campaign.segments)
  @JoinColumn({ name: 'campaignId' })
  campaign: EmailCampaign;

  @ManyToOne(() => UserSegment)
  @JoinColumn({ name: 'segmentId' })
  segment: UserSegment;
}
