import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { LoginAttempt, LoginStatus, LoginMethod } from '../entities/login-attempt.entity';
import { TrustedDevice } from '../entities/trusted-device.entity';
import { SecurityNotification, NotificationType, NotificationChannel } from '../entities/security-notification.entity';
import { GeoIpService, GeoLocation } from './geo-ip.service';
import { DeviceFingerprintService, DeviceInfo } from './device-fingerprint.service';
import { SecurityNotificationService } from './security-notification.service';

export interface LoginContext {
  userId: string;
  ipAddress: string;
  userAgent: string;
  method: LoginMethod;
  ownerId?: string;
}

@Injectable()
export class LoginSecurityService {
  private readonly logger = new Logger(LoginSecurityService.name);

  constructor(
    @InjectRepository(LoginAttempt)
    private loginAttemptRepository: Repository<LoginAttempt>,
    @InjectRepository(TrustedDevice)
    private trustedDeviceRepository: Repository<TrustedDevice>,
    private geoIpService: GeoIpService,
    private deviceFingerprintService: DeviceFingerprintService,
    private securityNotificationService: SecurityNotificationService,
  ) {}

  async recordLoginAttempt(context: LoginContext, status: LoginStatus, failureReason?: string): Promise<LoginAttempt> {
    try {
      // Get location information
      const location = await this.geoIpService.getLocationByIp(context.ipAddress);
      
      // Parse device information
      const deviceInfo = this.deviceFingerprintService.parseUserAgent(context.userAgent);

      // Check if this is a new location
      const isNewLocation = await this.isNewLocation(context.userId, location, context.ownerId);
      
      // Check if this is a new device
      const isNewDevice = await this.isNewDevice(context.userId, deviceInfo.fingerprint, context.ownerId);

      // Determine if login is suspicious
      const isSuspicious = await this.isSuspiciousLogin(context, status, isNewLocation, isNewDevice);

      // Create login attempt record
      const loginAttempt = this.loginAttemptRepository.create({
        userId: context.userId,
        status,
        method: context.method,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        deviceFingerprint: deviceInfo.fingerprint,
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        operatingSystem: deviceInfo.operatingSystem,
        country: location?.country,
        region: location?.region,
        city: location?.city,
        latitude: location?.latitude,
        longitude: location?.longitude,
        timezone: location?.timezone,
        isp: location?.isp,
        isNewLocation,
        isNewDevice,
        isSuspicious,
        failureReason,
        ownerId: context.ownerId,
      });

      const savedAttempt = await this.loginAttemptRepository.save(loginAttempt);

      // Handle successful login
      if (status === LoginStatus.SUCCESS) {
        await this.handleSuccessfulLogin(context, deviceInfo, location, isNewLocation, isNewDevice);
      }

      // Send notifications if needed
      if (status === LoginStatus.SUCCESS && (isNewLocation || isNewDevice || isSuspicious)) {
        await this.sendSecurityNotifications(savedAttempt);
      }

      return savedAttempt;
    } catch (error) {
      this.logger.error(`Error recording login attempt for user ${context.userId}:`, error);
      throw error;
    }
  }

  async getLoginHistory(userId: string, limit = 50, ownerId?: string): Promise<LoginAttempt[]> {
    const where: any = { userId };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    return this.loginAttemptRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getTrustedDevices(userId: string, ownerId?: string): Promise<TrustedDevice[]> {
    const where: any = { userId, isActive: true };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    return this.trustedDeviceRepository.find({
      where,
      order: { lastUsedAt: 'DESC' },
    });
  }

  async revokeTrustedDevice(deviceId: string, userId: string, ownerId?: string): Promise<void> {
    const where: any = { id: deviceId, userId };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    await this.trustedDeviceRepository.update(where, { isActive: false });
  }

  async getSecurityStats(userId: string, days = 30, ownerId?: string): Promise<any> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: any = { userId, createdAt: LessThan(since) };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    const attempts = await this.loginAttemptRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    const stats = {
      totalAttempts: attempts.length,
      successfulLogins: attempts.filter(a => a.status === LoginStatus.SUCCESS).length,
      failedAttempts: attempts.filter(a => a.status === LoginStatus.FAILED).length,
      newLocations: attempts.filter(a => a.isNewLocation).length,
      newDevices: attempts.filter(a => a.isNewDevice).length,
      suspiciousAttempts: attempts.filter(a => a.isSuspicious).length,
      uniqueCountries: [...new Set(attempts.map(a => a.country).filter(Boolean))].length,
      uniqueDevices: [...new Set(attempts.map(a => a.deviceFingerprint).filter(Boolean))].length,
    };

    return stats;
  }

  private async isNewLocation(userId: string, currentLocation: GeoLocation, ownerId?: string): Promise<boolean> {
    if (!currentLocation) return false;

    const where: any = { userId, status: LoginStatus.SUCCESS };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    const recentLogins = await this.loginAttemptRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const previousLocations = recentLogins
      .filter(login => login.latitude && login.longitude)
      .map(login => ({
        country: login.country,
        region: login.region,
        city: login.city,
        latitude: login.latitude,
        longitude: login.longitude,
        timezone: login.timezone,
        isp: login.isp,
      }));

    return this.geoIpService.isNewLocation(currentLocation, previousLocations);
  }

  private async isNewDevice(userId: string, deviceFingerprint: string, ownerId?: string): Promise<boolean> {
    const where: any = { userId, deviceFingerprint, isActive: true };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    const existingDevice = await this.trustedDeviceRepository.findOne({ where });
    return !existingDevice;
  }

  private async isSuspiciousLogin(
    context: LoginContext,
    status: LoginStatus,
    isNewLocation: boolean,
    isNewDevice: boolean,
  ): Promise<boolean> {
    // Failed login is always suspicious
    if (status === LoginStatus.FAILED) return true;

    // Both new location and new device is suspicious
    if (isNewLocation && isNewDevice) return true;

    // Check for multiple failed attempts from same IP recently
    const recentFailures = await this.loginAttemptRepository.count({
      where: {
        ipAddress: context.ipAddress,
        status: LoginStatus.FAILED,
        createdAt: LessThan(new Date(Date.now() - 24 * 60 * 60 * 1000)), // Last 24 hours
      },
    });

    return recentFailures >= 3;
  }

  private async handleSuccessfulLogin(
    context: LoginContext,
    deviceInfo: DeviceInfo,
    location: GeoLocation,
    isNewLocation: boolean,
    isNewDevice: boolean,
  ): Promise<void> {
    // Update or create trusted device
    if (isNewDevice) {
      await this.createTrustedDevice(context, deviceInfo, location);
    } else {
      await this.updateTrustedDevice(context.userId, deviceInfo.fingerprint, context.ownerId);
    }
  }

  private async createTrustedDevice(
    context: LoginContext,
    deviceInfo: DeviceInfo,
    location: GeoLocation,
  ): Promise<TrustedDevice> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // 90 days from now

    const trustedDevice = this.trustedDeviceRepository.create({
      userId: context.userId,
      deviceFingerprint: deviceInfo.fingerprint,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      operatingSystem: deviceInfo.operatingSystem,
      ipAddress: context.ipAddress,
      country: location?.country,
      region: location?.region,
      city: location?.city,
      lastUsedAt: new Date(),
      expiresAt,
      ownerId: context.ownerId,
    });

    return this.trustedDeviceRepository.save(trustedDevice);
  }

  private async updateTrustedDevice(userId: string, deviceFingerprint: string, ownerId?: string): Promise<void> {
    const where: any = { userId, deviceFingerprint, isActive: true };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    await this.trustedDeviceRepository.update(where, {
      lastUsedAt: new Date(),
    });
  }

  private async sendSecurityNotifications(loginAttempt: LoginAttempt): Promise<void> {
    try {
      if (loginAttempt.isNewLocation) {
        await this.securityNotificationService.sendNewLocationNotification(loginAttempt);
      }

      if (loginAttempt.isNewDevice) {
        await this.securityNotificationService.sendNewDeviceNotification(loginAttempt);
      }

      if (loginAttempt.isSuspicious) {
        await this.securityNotificationService.sendSuspiciousLoginNotification(loginAttempt);
      }

      // Mark notification as sent
      await this.loginAttemptRepository.update(loginAttempt.id, { notificationSent: true });
    } catch (error) {
      this.logger.error(`Error sending security notifications for login attempt ${loginAttempt.id}:`, error);
    }
  }
}
