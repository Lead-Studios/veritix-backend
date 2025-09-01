import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MetricType {
  CLICK_THROUGH_RATE = 'click_through_rate',
  CONVERSION_RATE = 'conversion_rate',
  ENGAGEMENT_RATE = 'engagement_rate',
  PRECISION_AT_K = 'precision_at_k',
  RECALL_AT_K = 'recall_at_k',
  DIVERSITY_SCORE = 'diversity_score',
  NOVELTY_SCORE = 'novelty_score',
  COVERAGE_SCORE = 'coverage_score',
}

@Entity()
@Index(['modelId', 'metricType'])
@Index(['date'])
@Index(['abTestGroup'])
export class RecommendationAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  modelId: string;

  @Column({
    type: 'enum',
    enum: MetricType,
  })
  metricType: MetricType;

  @Column({ type: 'float' })
  value: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ nullable: true })
  abTestGroup: string;

  @Column({ type: 'int', default: 0 })
  totalRecommendations: number;

  @Column({ type: 'int', default: 0 })
  totalViews: number;

  @Column({ type: 'int', default: 0 })
  totalClicks: number;

  @Column({ type: 'int', default: 0 })
  totalPurchases: number;

  @Column({ type: 'float', default: 0 })
  revenue: number;

  @Column({ type: 'json', nullable: true })
  segmentBreakdown: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  categoryBreakdown: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  ownerId: string;
}
