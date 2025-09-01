import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ModelType {
  COLLABORATIVE_FILTERING = 'collaborative_filtering',
  CONTENT_BASED = 'content_based',
  HYBRID = 'hybrid',
  DEEP_LEARNING = 'deep_learning',
  MATRIX_FACTORIZATION = 'matrix_factorization',
}

export enum ModelStatus {
  TRAINING = 'training',
  READY = 'ready',
  FAILED = 'failed',
  DEPRECATED = 'deprecated',
}

@Entity()
@Index(['modelType', 'status'])
@Index(['version'])
export class RecommendationModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: ModelType,
  })
  modelType: ModelType;

  @Column()
  version: string;

  @Column({
    type: 'enum',
    enum: ModelStatus,
    default: ModelStatus.TRAINING,
  })
  status: ModelStatus;

  @Column({ type: 'json', nullable: true })
  hyperparameters: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  trainingConfig: Record<string, any>;

  @Column({ type: 'float', nullable: true })
  accuracy: number;

  @Column({ type: 'float', nullable: true })
  precision: number;

  @Column({ type: 'float', nullable: true })
  recall: number;

  @Column({ type: 'float', nullable: true })
  f1Score: number;

  @Column({ type: 'float', nullable: true })
  auc: number;

  @Column({ type: 'int', default: 0 })
  trainingDataSize: number;

  @Column({ type: 'int', default: 0 })
  testDataSize: number;

  @Column({ type: 'int', default: 0 })
  trainingTime: number; // in seconds

  @Column({ type: 'json', nullable: true })
  featureImportance: Record<string, number>;

  @Column({ type: 'text', nullable: true })
  modelPath: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  trainedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deployedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  ownerId: string;
}
