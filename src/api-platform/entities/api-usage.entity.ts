import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiKey } from './api-key.entity';

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export enum ApiResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  RATE_LIMITED = 'rate_limited',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
}

@Entity()
@Index(['apiKeyId', 'timestamp'])
@Index(['endpoint', 'timestamp'])
@Index(['status', 'timestamp'])
@Index(['tenantId', 'timestamp'])
export class ApiUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  endpoint: string;

  @Column({ type: 'enum', enum: HttpMethod })
  method: HttpMethod;

  @Column()
  statusCode: number;

  @Column({ type: 'enum', enum: ApiResponseStatus })
  status: ApiResponseStatus;

  @Column({ type: 'bigint' })
  responseTime: number; // in milliseconds

  @Column({ type: 'bigint', nullable: true })
  requestSize: number; // in bytes

  @Column({ type: 'bigint', nullable: true })
  responseSize: number; // in bytes

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  referer: string;

  @Column({ type: 'json', nullable: true })
  requestHeaders: Record<string, string>;

  @Column({ type: 'json', nullable: true })
  queryParams: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  tenantId: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => ApiKey, (apiKey) => apiKey.usage, { onDelete: 'CASCADE' })
  apiKey: ApiKey;

  @Column()
  apiKeyId: string;

  @CreateDateColumn()
  timestamp: Date;
}
