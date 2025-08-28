import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DocumentationType {
  ENDPOINT = 'endpoint',
  MODEL = 'model',
  GUIDE = 'guide',
  TUTORIAL = 'tutorial',
  CHANGELOG = 'changelog',
}

export enum DocumentationStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  DEPRECATED = 'deprecated',
}

@Entity()
@Index(['type', 'status'])
@Index(['version', 'status'])
export class ApiDocumentation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: DocumentationType })
  type: DocumentationType;

  @Column({ type: 'enum', enum: DocumentationStatus, default: DocumentationStatus.DRAFT })
  status: DocumentationStatus;

  @Column()
  version: string;

  @Column({ nullable: true })
  endpoint: string; // For endpoint documentation

  @Column({ nullable: true })
  method: string; // HTTP method for endpoint docs

  @Column({ type: 'json', nullable: true })
  parameters: Record<string, any>; // Parameter definitions

  @Column({ type: 'json', nullable: true })
  responses: Record<string, any>; // Response examples

  @Column({ type: 'json', nullable: true })
  examples: Record<string, any>; // Code examples

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ nullable: true })
  parentId: string; // For hierarchical documentation

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
