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
import { ABTest } from './ab-test.entity';
import { EmailTemplate } from './email-template.entity';

@Entity('test_variants')
@Index(['testId', 'variantName'])
export class TestVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  testId: string;

  @Column({ type: 'varchar', length: 100 })
  variantName: string; // A, B, C, etc.

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false })
  isControl: boolean;

  @Column({ type: 'int', default: 50 })
  trafficPercentage: number;

  @Column({ type: 'uuid', nullable: true })
  templateId: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  subject: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  fromName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fromEmail: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'timestamp', nullable: true })
  sendTime: Date;

  @Column({ type: 'json', nullable: true })
  changes: {
    field: string;
    originalValue: any;
    testValue: any;
  }[];

  @Column({ type: 'int', default: 0 })
  sentCount: number;

  @Column({ type: 'int', default: 0 })
  deliveredCount: number;

  @Column({ type: 'int', default: 0 })
  openedCount: number;

  @Column({ type: 'int', default: 0 })
  clickedCount: number;

  @Column({ type: 'int', default: 0 })
  convertedCount: number;

  @Column({ type: 'int', default: 0 })
  unsubscribedCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  revenue: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  openRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  clickRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  unsubscribeRate: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ABTest, (test) => test.variants)
  @JoinColumn({ name: 'testId' })
  test: ABTest;

  @ManyToOne(() => EmailTemplate, { nullable: true })
  @JoinColumn({ name: 'templateId' })
  template: EmailTemplate;
}
