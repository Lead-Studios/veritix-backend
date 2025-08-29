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
import { UserSegment } from './user-segment.entity';

export enum RuleOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  BETWEEN = 'between',
  IN = 'in',
  NOT_IN = 'not_in',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
}

export enum RuleDataType {
  STRING = 'string',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
}

@Entity('segment_rules')
@Index(['segmentId', 'sortOrder'])
export class SegmentRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  segmentId: string;

  @Column({ type: 'varchar', length: 100 })
  fieldName: string;

  @Column({
    type: 'enum',
    enum: RuleOperator,
  })
  operator: RuleOperator;

  @Column({ type: 'json' })
  value: any;

  @Column({
    type: 'enum',
    enum: RuleDataType,
  })
  dataType: RuleDataType;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', length: 10, default: 'AND' })
  logicOperator: 'AND' | 'OR';

  @Column({ type: 'int', default: 0 })
  groupId: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserSegment, (segment) => segment.rules)
  @JoinColumn({ name: 'segmentId' })
  segment: UserSegment;
}
