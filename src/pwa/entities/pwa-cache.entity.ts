import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum CacheType {
  STATIC_ASSETS = 'static_assets',
  API_RESPONSE = 'api_response',
  USER_DATA = 'user_data',
  EVENT_DATA = 'event_data',
  TICKET_DATA = 'ticket_data',
  IMAGE_CACHE = 'image_cache',
  SEARCH_RESULTS = 'search_results',
}

export enum CacheStrategy {
  CACHE_FIRST = 'cache_first',
  NETWORK_FIRST = 'network_first',
  CACHE_ONLY = 'cache_only',
  NETWORK_ONLY = 'network_only',
  STALE_WHILE_REVALIDATE = 'stale_while_revalidate',
}

@Entity('pwa_cache')
@Index(['cacheKey'], { unique: true })
@Index(['cacheType', 'expiresAt'])
@Index(['lastAccessed'])
export class PWACache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cache_key', unique: true })
  cacheKey: string;

  @Column({
    type: 'enum',
    enum: CacheType,
  })
  cacheType: CacheType;

  @Column({
    type: 'enum',
    enum: CacheStrategy,
    default: CacheStrategy.CACHE_FIRST,
  })
  strategy: CacheStrategy;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  headers: Record<string, string>;

  @Column({ type: 'varchar', length: 100, nullable: true })
  etag: string;

  @Column({ type: 'timestamp', nullable: true })
  lastModified: Date;

  @Column({ type: 'integer' })
  size: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'integer', default: 0 })
  accessCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessed: Date;

  @Column({ type: 'integer', default: 3600 })
  ttl: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    version?: number;
    checksum?: string;
    dependencies?: string[];
    tags?: string[];
    priority?: number;
    compressionType?: string;
    originalSize?: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  get isStale(): boolean {
    const staleThreshold = new Date();
    staleThreshold.setMinutes(staleThreshold.getMinutes() - (this.ttl / 60));
    return this.updatedAt < staleThreshold;
  }

  get compressionRatio(): number {
    if (this.metadata?.originalSize && this.size) {
      return (this.metadata.originalSize - this.size) / this.metadata.originalSize;
    }
    return 0;
  }

  get hitRate(): number {
    const daysSinceCreated = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreated > 0 ? this.accessCount / daysSinceCreated : 0;
  }
}
