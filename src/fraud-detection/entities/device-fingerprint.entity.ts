import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DeviceRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum DeviceStatus {
  TRUSTED = 'trusted',
  SUSPICIOUS = 'suspicious',
  BLOCKED = 'blocked',
  UNKNOWN = 'unknown',
}

@Entity('device_fingerprints')
@Index(['fingerprintHash'])
@Index(['userId', 'status'])
@Index(['riskScore'])
@Index(['ipAddress'])
export class DeviceFingerprint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  @Index()
  fingerprintHash: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 45 })
  @Index()
  ipAddress: string;

  @Column({
    type: 'enum',
    enum: DeviceStatus,
    default: DeviceStatus.UNKNOWN,
  })
  @Index()
  status: DeviceStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 50 })
  @Index()
  riskScore: number;

  @Column({
    type: 'enum',
    enum: DeviceRiskLevel,
    default: DeviceRiskLevel.MEDIUM,
  })
  @Index()
  riskLevel: DeviceRiskLevel;

  @Column({ type: 'json' })
  browserFingerprint: {
    userAgent: string;
    language: string;
    languages: string[];
    platform: string;
    cookieEnabled: boolean;
    doNotTrack: string;
    timezone: string;
    screen: {
      width: number;
      height: number;
      colorDepth: number;
      pixelRatio: number;
    };
    viewport: {
      width: number;
      height: number;
    };
    plugins: Array<{
      name: string;
      version: string;
    }>;
    fonts: string[];
    canvas: string;
    webgl: string;
    audio: string;
  };

  @Column({ type: 'json' })
  deviceInfo: {
    deviceType: 'desktop' | 'mobile' | 'tablet';
    os: string;
    osVersion: string;
    browser: string;
    browserVersion: string;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    touchSupport: boolean;
    hardwareConcurrency: number;
    memory: number;
    connection: {
      effectiveType: string;
      downlink: number;
      rtt: number;
    };
  };

  @Column({ type: 'json' })
  networkInfo: {
    ipAddress: string;
    ipType: 'ipv4' | 'ipv6';
    isp: string;
    organization: string;
    asn: string;
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
    timezone: string;
    isProxy: boolean;
    isVpn: boolean;
    isTor: boolean;
    isHosting: boolean;
    threatLevel: string;
  };

  @Column({ type: 'json' })
  behavioralBiometrics: {
    mouseMovements: {
      averageSpeed: number;
      acceleration: number;
      jerk: number;
      angularVelocity: number;
    };
    keystrokeDynamics: {
      averageDwellTime: number;
      averageFlightTime: number;
      typingRhythm: number[];
      pressureSensitivity: number;
    };
    touchBehavior: {
      averagePressure: number;
      touchArea: number;
      swipeVelocity: number;
      tapDuration: number;
    };
    scrollBehavior: {
      scrollSpeed: number;
      scrollAcceleration: number;
      scrollPattern: string;
    };
  };

  @Column({ type: 'json' })
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    weight: number;
    detected: boolean;
    confidence: number;
  }>;

  @Column({ type: 'json' })
  anomalies: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    detectedAt: Date;
    confidence: number;
    details: Record<string, any>;
  }>;

  @Column({ type: 'json' })
  associatedUsers: Array<{
    userId: string;
    firstSeen: Date;
    lastSeen: Date;
    sessionCount: number;
    trustLevel: number;
  }>;

  @Column({ type: 'json' })
  locationHistory: Array<{
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
    timestamp: Date;
    accuracy: string;
  }>;

  @Column({ type: 'int', default: 1 })
  seenCount: number;

  @Column({ type: 'int', default: 0 })
  fraudulentSessions: number;

  @Column({ type: 'int', default: 0 })
  legitimateSessions: number;

  @Column({ type: 'timestamp', nullable: true })
  firstSeenAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastRiskAssessmentAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields
  get fraudRate(): number {
    const totalSessions = this.fraudulentSessions + this.legitimateSessions;
    return totalSessions > 0 ? (this.fraudulentSessions / totalSessions) * 100 : 0;
  }

  get isHighRisk(): boolean {
    return this.riskLevel === DeviceRiskLevel.HIGH || this.riskLevel === DeviceRiskLevel.CRITICAL;
  }

  get daysSinceFirstSeen(): number {
    if (!this.firstSeenAt) return 0;
    return Math.floor((new Date().getTime() - this.firstSeenAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  get daysSinceLastSeen(): number {
    if (!this.lastSeenAt) return 0;
    return Math.floor((new Date().getTime() - this.lastSeenAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  get isNewDevice(): boolean {
    return this.daysSinceFirstSeen <= 1;
  }

  get isStaleDevice(): boolean {
    return this.daysSinceLastSeen > 30;
  }

  get trustScore(): number {
    let score = 50; // Base score

    // Age factor
    if (this.daysSinceFirstSeen > 30) score += 10;
    if (this.daysSinceFirstSeen > 90) score += 10;

    // Usage frequency
    if (this.seenCount > 10) score += 5;
    if (this.seenCount > 50) score += 5;

    // Fraud history
    score -= this.fraudRate * 0.5;

    // Risk factors
    const criticalRiskFactors = this.riskFactors.filter(rf => rf.severity === 'critical' && rf.detected).length;
    const highRiskFactors = this.riskFactors.filter(rf => rf.severity === 'high' && rf.detected).length;
    
    score -= criticalRiskFactors * 20;
    score -= highRiskFactors * 10;

    return Math.max(0, Math.min(100, score));
  }
}
