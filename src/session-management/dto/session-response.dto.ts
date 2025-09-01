export class SessionResponseDto {
  id: string;
  ipAddress: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  browserVersion?: string;
  operatingSystem?: string;
  osVersion?: string;
  deviceName?: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  isActive: boolean;
  lastActivityAt: Date;
  expiresAt: Date;
  loginMethod?: string;
  isCurrentSession: boolean;
  createdAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
  revokedReason?: string;
}
