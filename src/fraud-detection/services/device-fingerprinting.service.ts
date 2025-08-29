import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceFingerprint, DeviceStatus, DeviceRiskLevel } from '../entities/device-fingerprint.entity';
import { RiskScore, RiskScoreType } from '../entities/risk-score.entity';
import * as crypto from 'crypto';

export interface DeviceFingerprintData {
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
  ipAddress: string;
  userId?: string;
}

export interface DeviceRiskAssessment {
  deviceId: string;
  riskScore: number;
  riskLevel: DeviceRiskLevel;
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    weight: number;
    detected: boolean;
    confidence: number;
  }>;
  recommendations: string[];
  trustScore: number;
}

@Injectable()
export class DeviceFingerprintingService {
  private readonly logger = new Logger(DeviceFingerprintingService.name);

  constructor(
    @InjectRepository(DeviceFingerprint)
    private deviceFingerprintRepository: Repository<DeviceFingerprint>,
    @InjectRepository(RiskScore)
    private riskScoreRepository: Repository<RiskScore>,
  ) {}

  async generateFingerprint(data: DeviceFingerprintData): Promise<DeviceFingerprint> {
    try {
      // Generate unique fingerprint hash
      const fingerprintHash = this.createFingerprintHash(data);
      
      // Check if device already exists
      let device = await this.deviceFingerprintRepository.findOne({
        where: { fingerprintHash },
      });

      if (device) {
        // Update existing device
        device = await this.updateExistingDevice(device, data);
      } else {
        // Create new device fingerprint
        device = await this.createNewDevice(data, fingerprintHash);
      }

      return device;
    } catch (error) {
      this.logger.error(`Error generating fingerprint: ${error.message}`, error.stack);
      throw error;
    }
  }

  async assessDeviceRisk(deviceId: string): Promise<DeviceRiskAssessment> {
    try {
      const device = await this.deviceFingerprintRepository.findOne({
        where: { id: deviceId },
      });

      if (!device) {
        throw new Error(`Device not found: ${deviceId}`);
      }

      // Analyze risk factors
      const riskFactors = await this.analyzeRiskFactors(device);
      
      // Calculate risk score
      const riskScore = this.calculateDeviceRiskScore(device, riskFactors);
      
      // Determine risk level
      const riskLevel = this.determineRiskLevel(riskScore);
      
      // Generate recommendations
      const recommendations = this.generateRiskRecommendations(riskFactors, riskLevel);
      
      // Update device risk information
      await this.updateDeviceRisk(device, riskScore, riskLevel, riskFactors);
      
      // Create risk score record
      await this.createRiskScoreRecord(device, riskScore, riskFactors);

      return {
        deviceId: device.id,
        riskScore,
        riskLevel,
        riskFactors,
        recommendations,
        trustScore: device.trustScore,
      };
    } catch (error) {
      this.logger.error(`Error assessing device risk: ${error.message}`, error.stack);
      throw error;
    }
  }

  private createFingerprintHash(data: DeviceFingerprintData): string {
    const fingerprintString = [
      data.userAgent,
      data.platform,
      data.language,
      data.languages.join(','),
      data.timezone,
      `${data.screen.width}x${data.screen.height}`,
      data.screen.colorDepth,
      data.screen.pixelRatio,
      data.plugins.map(p => `${p.name}:${p.version}`).join(','),
      data.fonts.join(','),
      data.canvas,
      data.webgl,
      data.audio,
    ].join('|');

    return crypto.createHash('sha256').update(fingerprintString).digest('hex');
  }

  private async updateExistingDevice(
    device: DeviceFingerprint,
    data: DeviceFingerprintData,
  ): Promise<DeviceFingerprint> {
    // Update usage statistics
    device.seenCount += 1;
    device.lastSeenAt = new Date();
    
    // Update IP address if changed
    if (device.ipAddress !== data.ipAddress) {
      device.ipAddress = data.ipAddress;
      
      // Add to location history
      const locationInfo = await this.getLocationInfo(data.ipAddress);
      device.locationHistory.push({
        ...locationInfo,
        timestamp: new Date(),
        accuracy: 'ip_based',
      });
    }

    // Update user association
    if (data.userId && device.userId !== data.userId) {
      const existingUser = device.associatedUsers.find(u => u.userId === data.userId);
      if (existingUser) {
        existingUser.lastSeen = new Date();
        existingUser.sessionCount += 1;
      } else {
        device.associatedUsers.push({
          userId: data.userId,
          firstSeen: new Date(),
          lastSeen: new Date(),
          sessionCount: 1,
          trustLevel: 50,
        });
      }
    }

    return await this.deviceFingerprintRepository.save(device);
  }

  private async createNewDevice(
    data: DeviceFingerprintData,
    fingerprintHash: string,
  ): Promise<DeviceFingerprint> {
    const locationInfo = await this.getLocationInfo(data.ipAddress);
    const networkInfo = await this.getNetworkInfo(data.ipAddress);
    const deviceInfo = this.parseDeviceInfo(data);
    const behavioralBiometrics = this.initializeBehavioralBiometrics();

    const device = this.deviceFingerprintRepository.create({
      fingerprintHash,
      userId: data.userId,
      ipAddress: data.ipAddress,
      status: DeviceStatus.UNKNOWN,
      riskScore: 50,
      riskLevel: DeviceRiskLevel.MEDIUM,
      browserFingerprint: {
        userAgent: data.userAgent,
        language: data.language,
        languages: data.languages,
        platform: data.platform,
        cookieEnabled: data.cookieEnabled,
        doNotTrack: data.doNotTrack,
        timezone: data.timezone,
        screen: data.screen,
        viewport: data.viewport,
        plugins: data.plugins,
        fonts: data.fonts,
        canvas: data.canvas,
        webgl: data.webgl,
        audio: data.audio,
      },
      deviceInfo,
      networkInfo,
      behavioralBiometrics,
      riskFactors: [],
      anomalies: [],
      associatedUsers: data.userId ? [{
        userId: data.userId,
        firstSeen: new Date(),
        lastSeen: new Date(),
        sessionCount: 1,
        trustLevel: 50,
      }] : [],
      locationHistory: [{
        ...locationInfo,
        timestamp: new Date(),
        accuracy: 'ip_based',
      }],
      seenCount: 1,
      fraudulentSessions: 0,
      legitimateSessions: 0,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      lastRiskAssessmentAt: new Date(),
      isActive: true,
    });

    return await this.deviceFingerprintRepository.save(device);
  }

  private async analyzeRiskFactors(device: DeviceFingerprint): Promise<DeviceRiskAssessment['riskFactors']> {
    const riskFactors = [];

    // Check for proxy/VPN usage
    if (device.networkInfo.isProxy || device.networkInfo.isVpn) {
      riskFactors.push({
        factor: 'proxy_vpn_usage',
        severity: 'high' as const,
        description: 'Device is using proxy or VPN connection',
        weight: 30,
        detected: true,
        confidence: 90,
      });
    }

    // Check for Tor usage
    if (device.networkInfo.isTor) {
      riskFactors.push({
        factor: 'tor_usage',
        severity: 'critical' as const,
        description: 'Device is using Tor network',
        weight: 50,
        detected: true,
        confidence: 95,
      });
    }

    // Check for hosting provider IP
    if (device.networkInfo.isHosting) {
      riskFactors.push({
        factor: 'hosting_ip',
        severity: 'medium' as const,
        description: 'IP address belongs to hosting provider',
        weight: 20,
        detected: true,
        confidence: 85,
      });
    }

    // Check for multiple user associations
    if (device.associatedUsers.length > 3) {
      riskFactors.push({
        factor: 'multiple_users',
        severity: 'high' as const,
        description: 'Device associated with multiple user accounts',
        weight: 35,
        detected: true,
        confidence: 80,
      });
    }

    // Check for rapid location changes
    const locationChanges = this.analyzeLocationChanges(device.locationHistory);
    if (locationChanges.impossibleTravel) {
      riskFactors.push({
        factor: 'impossible_travel',
        severity: 'critical' as const,
        description: 'Device shows impossible travel patterns',
        weight: 45,
        detected: true,
        confidence: 95,
      });
    }

    // Check for browser inconsistencies
    const browserInconsistencies = this.analyzeBrowserInconsistencies(device.browserFingerprint);
    if (browserInconsistencies.length > 0) {
      riskFactors.push({
        factor: 'browser_inconsistencies',
        severity: 'medium' as const,
        description: 'Browser fingerprint shows inconsistencies',
        weight: 15,
        detected: true,
        confidence: 70,
      });
    }

    // Check fraud history
    if (device.fraudRate > 10) {
      riskFactors.push({
        factor: 'fraud_history',
        severity: 'critical' as const,
        description: 'Device has history of fraudulent activity',
        weight: 60,
        detected: true,
        confidence: 100,
      });
    }

    // Check for new device
    if (device.isNewDevice) {
      riskFactors.push({
        factor: 'new_device',
        severity: 'low' as const,
        description: 'Device is new and has limited history',
        weight: 10,
        detected: true,
        confidence: 100,
      });
    }

    return riskFactors;
  }

  private calculateDeviceRiskScore(
    device: DeviceFingerprint,
    riskFactors: DeviceRiskAssessment['riskFactors'],
  ): number {
    let score = 0;
    let totalWeight = 0;

    // Calculate weighted risk score from factors
    riskFactors.forEach(factor => {
      if (factor.detected) {
        const severityMultiplier = {
          low: 0.25,
          medium: 0.5,
          high: 0.75,
          critical: 1.0,
        };
        
        const factorScore = factor.weight * severityMultiplier[factor.severity] * (factor.confidence / 100);
        score += factorScore;
        totalWeight += factor.weight;
      }
    });

    // Normalize score
    if (totalWeight > 0) {
      score = (score / totalWeight) * 100;
    }

    // Apply device history adjustments
    if (device.legitimateSessions > 10) {
      score *= 0.8; // Reduce risk for devices with good history
    }

    if (device.daysSinceFirstSeen > 30) {
      score *= 0.9; // Reduce risk for older devices
    }

    return Math.max(0, Math.min(100, score));
  }

  private determineRiskLevel(riskScore: number): DeviceRiskLevel {
    if (riskScore >= 80) return DeviceRiskLevel.CRITICAL;
    if (riskScore >= 60) return DeviceRiskLevel.HIGH;
    if (riskScore >= 30) return DeviceRiskLevel.MEDIUM;
    return DeviceRiskLevel.LOW;
  }

  private generateRiskRecommendations(
    riskFactors: DeviceRiskAssessment['riskFactors'],
    riskLevel: DeviceRiskLevel,
  ): string[] {
    const recommendations = [];

    if (riskLevel === DeviceRiskLevel.CRITICAL) {
      recommendations.push('Block all transactions from this device');
      recommendations.push('Require manual review for any activity');
      recommendations.push('Consider permanent device ban');
    } else if (riskLevel === DeviceRiskLevel.HIGH) {
      recommendations.push('Require additional authentication');
      recommendations.push('Limit transaction amounts');
      recommendations.push('Monitor all activity closely');
    } else if (riskLevel === DeviceRiskLevel.MEDIUM) {
      recommendations.push('Apply enhanced monitoring');
      recommendations.push('Consider step-up authentication for high-value transactions');
    }

    // Specific factor recommendations
    riskFactors.forEach(factor => {
      switch (factor.factor) {
        case 'proxy_vpn_usage':
          recommendations.push('Request device verification through alternative means');
          break;
        case 'tor_usage':
          recommendations.push('Block Tor traffic or require special verification');
          break;
        case 'multiple_users':
          recommendations.push('Investigate shared device usage patterns');
          break;
        case 'impossible_travel':
          recommendations.push('Verify user location through additional methods');
          break;
      }
    });

    return [...new Set(recommendations)];
  }

  private async updateDeviceRisk(
    device: DeviceFingerprint,
    riskScore: number,
    riskLevel: DeviceRiskLevel,
    riskFactors: DeviceRiskAssessment['riskFactors'],
  ): Promise<void> {
    device.riskScore = riskScore;
    device.riskLevel = riskLevel;
    device.riskFactors = riskFactors;
    device.lastRiskAssessmentAt = new Date();

    // Update status based on risk level
    if (riskLevel === DeviceRiskLevel.CRITICAL) {
      device.status = DeviceStatus.BLOCKED;
    } else if (riskLevel === DeviceRiskLevel.HIGH) {
      device.status = DeviceStatus.SUSPICIOUS;
    } else if (riskLevel === DeviceRiskLevel.LOW && device.daysSinceFirstSeen > 7) {
      device.status = DeviceStatus.TRUSTED;
    }

    await this.deviceFingerprintRepository.save(device);
  }

  private async createRiskScoreRecord(
    device: DeviceFingerprint,
    riskScore: number,
    riskFactors: DeviceRiskAssessment['riskFactors'],
  ): Promise<void> {
    const riskScoreRecord = this.riskScoreRepository.create({
      entityId: device.id,
      entityType: RiskScoreType.DEVICE,
      riskScore,
      confidence: 85,
      scoreBreakdown: {
        identity: { score: 0, weight: 0, factors: [] },
        behavioral: { score: 0, weight: 0, factors: [] },
        deviceBased: { 
          score: riskScore, 
          weight: 100, 
          factors: riskFactors.map(rf => ({
            name: rf.factor,
            value: rf.detected ? 1 : 0,
            impact: rf.weight,
            description: rf.description,
          }))
        },
        locationBased: { score: 0, weight: 0, factors: [] },
        velocity: { score: 0, weight: 0, factors: [] },
        network: { score: 0, weight: 0, factors: [] },
        payment: { score: 0, weight: 0, factors: [] },
      },
      mlPredictions: [],
      ruleResults: [],
      contextualFactors: {
        timeOfDay: new Date().getHours().toString(),
        dayOfWeek: new Date().getDay().toString(),
        isHoliday: false,
        eventType: 'device_assessment',
        ticketPrice: 0,
        paymentMethod: 'unknown',
        userTenure: 0,
        previousTransactions: 0,
        accountAge: 0,
        deviceAge: device.daysSinceFirstSeen,
        locationFamiliarity: 0,
      },
      velocityMetrics: {
        transactionVelocity: {
          last1Hour: 0,
          last24Hours: 0,
          last7Days: 0,
          threshold: 10,
          exceeded: false,
        },
        amountVelocity: {
          last1Hour: 0,
          last24Hours: 0,
          last7Days: 0,
          threshold: 1000,
          exceeded: false,
        },
        deviceVelocity: {
          uniqueDevices24h: 1,
          uniqueDevices7d: 1,
          threshold: 5,
          exceeded: false,
        },
        locationVelocity: {
          uniqueLocations24h: 1,
          uniqueLocations7d: 1,
          impossibleTravel: false,
        },
      },
      externalSignals: [],
      historicalComparison: {
        userBaseline: 50,
        deviceBaseline: riskScore,
        globalBaseline: 30,
        deviationFromUser: 0,
        deviationFromDevice: 0,
        deviationFromGlobal: riskScore - 30,
      },
      triggeredBy: 'device_fingerprinting_service',
      recommendedActions: riskFactors.map(rf => ({
        action: `address_${rf.factor}`,
        priority: rf.severity as any,
        description: rf.description,
        automated: false,
      })),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      isActive: true,
    });

    await this.riskScoreRepository.save(riskScoreRecord);
  }

  private async getLocationInfo(ipAddress: string): Promise<any> {
    // Mock implementation - in production, use IP geolocation service
    return {
      country: 'US',
      region: 'California',
      city: 'San Francisco',
      latitude: 37.7749,
      longitude: -122.4194,
      timezone: 'America/Los_Angeles',
    };
  }

  private async getNetworkInfo(ipAddress: string): Promise<any> {
    // Mock implementation - in production, use threat intelligence APIs
    return {
      ipAddress,
      ipType: 'ipv4',
      isp: 'Example ISP',
      organization: 'Example Org',
      asn: 'AS12345',
      country: 'US',
      region: 'California',
      city: 'San Francisco',
      latitude: 37.7749,
      longitude: -122.4194,
      timezone: 'America/Los_Angeles',
      isProxy: false,
      isVpn: false,
      isTor: false,
      isHosting: false,
      threatLevel: 'low',
    };
  }

  private parseDeviceInfo(data: DeviceFingerprintData): any {
    // Parse user agent and extract device information
    const userAgent = data.userAgent;
    
    return {
      deviceType: data.screen.width < 768 ? 'mobile' : 'desktop',
      os: this.extractOS(userAgent),
      osVersion: this.extractOSVersion(userAgent),
      browser: this.extractBrowser(userAgent),
      browserVersion: this.extractBrowserVersion(userAgent),
      isMobile: data.screen.width < 768,
      isTablet: data.screen.width >= 768 && data.screen.width < 1024,
      isDesktop: data.screen.width >= 1024,
      touchSupport: 'ontouchstart' in window,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      memory: (navigator as any).deviceMemory || 4,
      connection: {
        effectiveType: '4g',
        downlink: 10,
        rtt: 100,
      },
    };
  }

  private initializeBehavioralBiometrics(): any {
    return {
      mouseMovements: {
        averageSpeed: 0,
        acceleration: 0,
        jerk: 0,
        angularVelocity: 0,
      },
      keystrokeDynamics: {
        averageDwellTime: 0,
        averageFlightTime: 0,
        typingRhythm: [],
        pressureSensitivity: 0,
      },
      touchBehavior: {
        averagePressure: 0,
        touchArea: 0,
        swipeVelocity: 0,
        tapDuration: 0,
      },
      scrollBehavior: {
        scrollSpeed: 0,
        scrollAcceleration: 0,
        scrollPattern: 'normal',
      },
    };
  }

  private analyzeLocationChanges(locationHistory: any[]): { impossibleTravel: boolean } {
    if (locationHistory.length < 2) return { impossibleTravel: false };

    // Check for impossible travel between consecutive locations
    for (let i = 1; i < locationHistory.length; i++) {
      const prev = locationHistory[i - 1];
      const curr = locationHistory[i];
      
      const distance = this.calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
      
      const timeDiff = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000 / 3600; // hours
      const maxSpeed = 1000; // km/h (commercial aircraft speed)
      
      if (distance > maxSpeed * timeDiff) {
        return { impossibleTravel: true };
      }
    }

    return { impossibleTravel: false };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private analyzeBrowserInconsistencies(browserFingerprint: any): string[] {
    const inconsistencies = [];

    // Check for common spoofing patterns
    if (browserFingerprint.plugins.length === 0) {
      inconsistencies.push('No plugins detected - possible headless browser');
    }

    if (browserFingerprint.fonts.length < 10) {
      inconsistencies.push('Unusually few fonts - possible spoofing');
    }

    return inconsistencies;
  }

  private extractOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private extractOSVersion(userAgent: string): string {
    // Simplified version extraction
    return '1.0';
  }

  private extractBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private extractBrowserVersion(userAgent: string): string {
    // Simplified version extraction
    return '1.0';
  }
}
