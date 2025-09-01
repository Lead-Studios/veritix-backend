import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum PWAEventType {
  APP_INSTALL = 'app_install',
  APP_LAUNCH = 'app_launch',
  OFFLINE_ACCESS = 'offline_access',
  OFFLINE_USAGE = 'offline_usage',
  BACKGROUND_SYNC = 'background_sync',
  PUSH_NOTIFICATION_RECEIVED = 'push_notification_received',
  PUSH_NOTIFICATION_CLICKED = 'push_notification_clicked',
  SERVICE_WORKER_UPDATE = 'service_worker_update',
  CACHE_HIT = 'cache_hit',
  CACHE_MISS = 'cache_miss',
  NETWORK_ERROR = 'network_error',
  OFFLINE_FALLBACK = 'offline_fallback',
}

export enum DeviceOrientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
  UNKNOWN = 'unknown',
}

@Entity('pwa_analytics')
@Index(['userId', 'eventType'])
@Index(['eventType', 'createdAt'])
@Index(['sessionId'])
export class PWAAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'session_id' })
  sessionId: string;

  @Column({
    type: 'enum',
    enum: PWAEventType,
  })
  eventType: PWAEventType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  browserName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  osName: string;

  @Column({
    type: 'enum',
    enum: DeviceOrientation,
    default: DeviceOrientation.UNKNOWN,
  })
  orientation: DeviceOrientation;

  @Column({ type: 'integer', nullable: true })
  screenWidth: number;

  @Column({ type: 'integer', nullable: true })
  screenHeight: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  networkType: string;

  @Column({ type: 'boolean', default: false })
  isOnline: boolean;

  @Column({ type: 'boolean', default: false })
  isStandalone: boolean;

  @Column({ type: 'integer', nullable: true })
  batteryLevel: number;

  @Column({ type: 'jsonb', nullable: true })
  performanceMetrics: {
    loadTime?: number;
    renderTime?: number;
    cacheHitRate?: number;
    memoryUsage?: number;
    cpuUsage?: number;
    networkLatency?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  eventData: {
    notificationId?: string;
    syncJobId?: string;
    cacheKey?: string;
    errorCode?: string;
    errorMessage?: string;
    duration?: number;
    dataSize?: number;
    customData?: Record<string, any>;
  };

  @Column({ type: 'varchar', length: 100, nullable: true })
  referrer: string;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get deviceInfo(): string {
    const parts = [this.deviceType, this.browserName, this.osName].filter(Boolean);
    return parts.join(' - ') || 'Unknown Device';
  }

  get screenResolution(): string {
    if (this.screenWidth && this.screenHeight) {
      return `${this.screenWidth}x${this.screenHeight}`;
    }
    return 'Unknown';
  }

  get isHighPerformance(): boolean {
    if (!this.performanceMetrics) return false;
    
    const { loadTime, renderTime, networkLatency } = this.performanceMetrics;
    return (loadTime || 0) < 2000 && 
           (renderTime || 0) < 1000 && 
           (networkLatency || 0) < 500;
  }
}
