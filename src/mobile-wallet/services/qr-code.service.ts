import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { WalletPass } from '../entities/wallet-pass.entity';
import { PassAnalytics, AnalyticsEventType } from '../entities/pass-analytics.entity';

export interface QRCodeData {
  ticketId: string;
  eventId: string;
  userId: string;
  passId: string;
  validationCode: string;
  timestamp: number;
  signature: string;
}

export interface QRCodeGenerationOptions {
  size?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  type?: 'image/png' | 'image/jpeg' | 'image/webp';
  quality?: number;
}

export interface QRCodeValidationResult {
  isValid: boolean;
  data?: QRCodeData;
  error?: string;
  ticketInfo?: {
    ticketId: string;
    eventId: string;
    userId: string;
    passId: string;
    eventName: string;
    userName: string;
    seatInfo?: string;
  };
}

@Injectable()
export class QRCodeService {
  private readonly logger = new Logger(QRCodeService.name);
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(WalletPass)
    private passRepository: Repository<WalletPass>,
    @InjectRepository(PassAnalytics)
    private analyticsRepository: Repository<PassAnalytics>,
    private configService: ConfigService,
  ) {
    this.secretKey = this.configService.get<string>('QR_CODE_SECRET_KEY') || 'default-secret-key';
    this.baseUrl = this.configService.get<string>('QR_CODE_BASE_URL') || 'https://api.veritix.com';
  }

  /**
   * Generate QR code data for a wallet pass
   */
  async generateQRCodeData(passId: string): Promise<QRCodeData> {
    this.logger.log(`Generating QR code data for pass: ${passId}`);

    const walletPass = await this.passRepository.findOne({
      where: { id: passId },
      relations: ['user', 'event', 'ticket'],
    });

    if (!walletPass) {
      throw new Error('Wallet pass not found');
    }

    const validationCode = this.generateValidationCode();
    const timestamp = Date.now();

    const qrData: QRCodeData = {
      ticketId: walletPass.ticketId,
      eventId: walletPass.eventId,
      userId: walletPass.userId,
      passId: walletPass.id,
      validationCode,
      timestamp,
      signature: '',
    };

    // Generate signature
    qrData.signature = this.generateSignature(qrData);

    // Update pass with QR code data
    await this.passRepository.update(passId, {
      qrCodeData: JSON.stringify(qrData),
      barcodeMessage: this.encodeQRData(qrData),
    });

    return qrData;
  }

  /**
   * Generate QR code image
   */
  async generateQRCodeImage(
    passId: string,
    options: QRCodeGenerationOptions = {}
  ): Promise<{
    success: boolean;
    imageBuffer?: Buffer;
    imageUrl?: string;
    qrData?: QRCodeData;
    error?: string;
  }> {
    try {
      const qrData = await this.generateQRCodeData(passId);
      const qrString = this.encodeQRData(qrData);

      const defaultOptions = {
        size: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M' as const,
        type: 'image/png' as const,
        quality: 0.92,
      };

      const qrOptions = { ...defaultOptions, ...options };

      // Generate QR code image
      const imageBuffer = await QRCode.toBuffer(qrString, {
        width: qrOptions.size,
        margin: qrOptions.margin,
        color: qrOptions.color,
        errorCorrectionLevel: qrOptions.errorCorrectionLevel,
        type: 'png',
      });

      // Track analytics
      await this.trackAnalytics(passId, AnalyticsEventType.QR_CODE_SCANNED);

      return {
        success: true,
        imageBuffer,
        imageUrl: `${this.baseUrl}/api/mobile-wallet/passes/${passId}/qr-code`,
        qrData,
      };
    } catch (error) {
      this.logger.error(`Failed to generate QR code image: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate QR code data
   */
  async validateQRCode(qrString: string, scanLocation?: string): Promise<QRCodeValidationResult> {
    this.logger.log(`Validating QR code: ${qrString.substring(0, 20)}...`);

    try {
      const qrData = this.decodeQRData(qrString);

      // Verify signature
      const expectedSignature = this.generateSignature({
        ...qrData,
        signature: '',
      });

      if (qrData.signature !== expectedSignature) {
        return {
          isValid: false,
          error: 'Invalid QR code signature',
        };
      }

      // Check if QR code is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (Date.now() - qrData.timestamp > maxAge) {
        return {
          isValid: false,
          error: 'QR code has expired',
        };
      }

      // Get pass information
      const walletPass = await this.passRepository.findOne({
        where: { id: qrData.passId },
        relations: ['user', 'event', 'ticket'],
      });

      if (!walletPass) {
        return {
          isValid: false,
          error: 'Pass not found',
        };
      }

      // Check if pass is still valid
      if (walletPass.isExpired) {
        return {
          isValid: false,
          error: 'Pass has expired',
        };
      }

      if (!walletPass.isActive) {
        return {
          isValid: false,
          error: 'Pass is not active',
        };
      }

      // Track scan analytics
      await this.trackScanAnalytics(qrData.passId, scanLocation);

      const ticketInfo = {
        ticketId: walletPass.ticketId,
        eventId: walletPass.eventId,
        userId: walletPass.userId,
        passId: walletPass.id,
        eventName: walletPass.event.name,
        userName: `${walletPass.user.firstName} ${walletPass.user.lastName}`,
        seatInfo: this.formatSeatInfo(walletPass.ticket),
      };

      return {
        isValid: true,
        data: qrData,
        ticketInfo,
      };
    } catch (error) {
      this.logger.error(`QR code validation failed: ${error.message}`);
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate dynamic QR code for rotating codes
   */
  async generateDynamicQRCode(
    passId: string,
    rotationInterval: number = 30000 // 30 seconds
  ): Promise<{
    success: boolean;
    qrData?: QRCodeData;
    nextRotation?: Date;
    error?: string;
  }> {
    try {
      const baseQRData = await this.generateQRCodeData(passId);
      
      // Add rotation timestamp
      const rotationTimestamp = Math.floor(Date.now() / rotationInterval) * rotationInterval;
      const dynamicData = {
        ...baseQRData,
        rotationTimestamp,
        rotationInterval,
      };

      // Generate new signature with rotation data
      dynamicData.signature = this.generateSignature(dynamicData);

      const nextRotation = new Date(rotationTimestamp + rotationInterval);

      return {
        success: true,
        qrData: dynamicData,
        nextRotation,
      };
    } catch (error) {
      this.logger.error(`Failed to generate dynamic QR code: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Batch generate QR codes for multiple passes
   */
  async batchGenerateQRCodes(
    passIds: string[],
    options: QRCodeGenerationOptions = {}
  ): Promise<{
    success: boolean;
    results: Array<{
      passId: string;
      success: boolean;
      imageBuffer?: Buffer;
      qrData?: QRCodeData;
      error?: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    this.logger.log(`Batch generating QR codes for ${passIds.length} passes`);

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const passId of passIds) {
      try {
        const result = await this.generateQRCodeImage(passId, options);
        results.push({
          passId,
          success: result.success,
          imageBuffer: result.imageBuffer,
          qrData: result.qrData,
          error: result.error,
        });

        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        results.push({
          passId,
          success: false,
          error: error.message,
        });
        failed++;
      }
    }

    return {
      success: failed === 0,
      results,
      summary: {
        total: passIds.length,
        successful,
        failed,
      },
    };
  }

  /**
   * Get QR code analytics for a pass
   */
  async getQRCodeAnalytics(passId: string, days: number = 30): Promise<{
    totalScans: number;
    uniqueScans: number;
    scansByDay: Array<{ date: string; scans: number }>;
    scansByLocation: Array<{ location: string; scans: number }>;
    scansByDevice: Array<{ deviceType: string; scans: number }>;
    lastScanAt?: Date;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await this.analyticsRepository.find({
      where: {
        walletPassId: passId,
        eventType: AnalyticsEventType.QR_CODE_SCANNED,
        timestamp: { $gte: startDate } as any,
      },
      order: { timestamp: 'DESC' },
    });

    const totalScans = analytics.length;
    const uniqueDevices = new Set(analytics.map(a => a.deviceId).filter(Boolean));
    const uniqueScans = uniqueDevices.size;

    // Group by day
    const scansByDay = this.groupAnalyticsByDay(analytics, days);

    // Group by location
    const locationCounts = analytics.reduce((acc, scan) => {
      const location = scan.eventData?.scanLocation || 'Unknown';
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {});

    const scansByLocation = Object.entries(locationCounts).map(([location, scans]) => ({
      location,
      scans: scans as number,
    }));

    // Group by device type
    const deviceCounts = analytics.reduce((acc, scan) => {
      const deviceType = scan.deviceType || 'Unknown';
      acc[deviceType] = (acc[deviceType] || 0) + 1;
      return acc;
    }, {});

    const scansByDevice = Object.entries(deviceCounts).map(([deviceType, scans]) => ({
      deviceType,
      scans: scans as number,
    }));

    const lastScanAt = analytics.length > 0 ? analytics[0].timestamp : undefined;

    return {
      totalScans,
      uniqueScans,
      scansByDay,
      scansByLocation,
      scansByDevice,
      lastScanAt,
    };
  }

  // Private helper methods

  private generateValidationCode(): string {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }

  private generateSignature(data: Partial<QRCodeData>): string {
    const payload = `${data.ticketId}:${data.eventId}:${data.userId}:${data.passId}:${data.validationCode}:${data.timestamp}`;
    return crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
  }

  private encodeQRData(data: QRCodeData): string {
    // Create a compact, URL-safe representation
    const payload = {
      t: data.ticketId,
      e: data.eventId,
      u: data.userId,
      p: data.passId,
      v: data.validationCode,
      ts: data.timestamp,
      s: data.signature,
    };

    return `${this.baseUrl}/verify/${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
  }

  private decodeQRData(qrString: string): QRCodeData {
    // Extract the base64url encoded data from the URL
    const urlPattern = new RegExp(`${this.baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/verify/(.+)`);
    const match = qrString.match(urlPattern);

    if (!match) {
      throw new Error('Invalid QR code format');
    }

    const encodedData = match[1];
    const payload = JSON.parse(Buffer.from(encodedData, 'base64url').toString());

    return {
      ticketId: payload.t,
      eventId: payload.e,
      userId: payload.u,
      passId: payload.p,
      validationCode: payload.v,
      timestamp: payload.ts,
      signature: payload.s,
    };
  }

  private formatSeatInfo(ticket: any): string {
    const parts = [];
    if (ticket.section) parts.push(`Section ${ticket.section}`);
    if (ticket.row) parts.push(`Row ${ticket.row}`);
    if (ticket.seatNumber) parts.push(`Seat ${ticket.seatNumber}`);
    return parts.join(', ') || 'General Admission';
  }

  private async trackAnalytics(passId: string, eventType: AnalyticsEventType): Promise<void> {
    try {
      await this.analyticsRepository.save({
        walletPassId: passId,
        eventType,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.warn(`Failed to track analytics: ${error.message}`);
    }
  }

  private async trackScanAnalytics(passId: string, scanLocation?: string): Promise<void> {
    try {
      await this.analyticsRepository.save({
        walletPassId: passId,
        eventType: AnalyticsEventType.QR_CODE_SCANNED,
        timestamp: new Date(),
        eventData: {
          scanLocation: scanLocation || 'Unknown',
          scanDevice: 'Mobile',
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to track scan analytics: ${error.message}`);
    }
  }

  private groupAnalyticsByDay(analytics: PassAnalytics[], days: number): Array<{ date: string; scans: number }> {
    const dayMap = new Map<string, number>();

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dayMap.set(dateStr, 0);
    }

    // Count scans by day
    analytics.forEach(scan => {
      const dateStr = scan.timestamp.toISOString().split('T')[0];
      if (dayMap.has(dateStr)) {
        dayMap.set(dateStr, dayMap.get(dateStr)! + 1);
      }
    });

    // Convert to array and sort by date
    return Array.from(dayMap.entries())
      .map(([date, scans]) => ({ date, scans }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
