import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ExperimentStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ExperimentType {
  ALGORITHM_COMPARISON = 'algorithm_comparison',
  PARAMETER_TUNING = 'parameter_tuning',
  FEATURE_TESTING = 'feature_testing',
  UI_TESTING = 'ui_testing',
}

@Entity()
@Index(['status'])
@Index(['startDate', 'endDate'])
export class AbTestExperiment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ExperimentType,
  })
  experimentType: ExperimentType;

  @Column({
    type: 'enum',
    enum: ExperimentStatus,
    default: ExperimentStatus.DRAFT,
  })
  status: ExperimentStatus;

  @Column({ type: 'json' })
  variants: Record<string, any>[];

  @Column({ type: 'json', nullable: true })
  trafficAllocation: Record<string, number>;

  @Column({ type: 'json' })
  targetMetrics: string[];

  @Column({ type: 'json', nullable: true })
  segmentCriteria: Record<string, any>;

  @Column({ type: 'float', default: 0.05 })
  significanceLevel: number;

  @Column({ type: 'float', default: 0.8 })
  statisticalPower: number;

  @Column({ type: 'int', nullable: true })
  minimumSampleSize: number;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'json', nullable: true })
  results: Record<string, any>;

  @Column({ nullable: true })
  winningVariant: string;

  @Column({ type: 'float', nullable: true })
  confidenceLevel: number;

  @Column({ type: 'text', nullable: true })
  conclusion: string;

  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  ownerId: string;
}
