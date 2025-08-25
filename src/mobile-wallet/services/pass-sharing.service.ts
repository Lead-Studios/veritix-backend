import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as crypto from 'crypto';
import { WalletPass, PassStatus } from '../entities/wallet-pass.entity';
import { PassAnalytics, AnalyticsEventType } from '../entities/pass-analytics.entity';

export interface SharePassRequest {
  passId: string;
  shareWithEmails: string[];
  shareWithPhones?: string[];
  shareMessage?: string;
  expiresAt?: Date;
  allowForwarding?: boolean;
  maxShares?: number;
}

export interface SharePassResult {
  success: boolean;
  shareToken: string;
  shareUrl: string;
  sharedWith: string[];
  expiresAt: Date;
  error?: string;
}

export interface GroupBookingShare {
  groupId: string;
  organizerId: string;
  eventId: string;
  passIds: string[];
  shareSettings: {
    allowIndividualSharing: boolean;
    requireApproval: boolean;
    maxSharesPerPass: number;
    shareExpiryHours: number;
  };
}

export interface SharedPassAccess {
  shareToken: string;
  accessedBy: string;
  accessedAt: Date;
  deviceInfo?: {
    userAgent: string;
    ipAddress: string;
    deviceType: string;
  };
}

@Injectable()
export class PassSharingService {
  private readonly logger = new Logger(PassSharingService.name);

  constructor(
    @InjectRepository(WalletPass)
    private passRepository: Repository<WalletPass>,
    @InjectRepository(PassAnalytics)
    private analyticsRepository: Repository<PassAnalytics>,
    @InjectQueue('pass-sharing')
    private sharingQueue: Queue,
  ) {}

  /**
   * Share a pass with specific recipients
   */
  async sharePass(request: SharePassRequest): Promise<SharePassResult> {
    this.logger.log(`Sharing pass ${request.passId} with ${request.shareWithEmails.length} recipients`);

    try {
      const pass = await this.passRepository.findOne({
        where: { id: request.passId },
        relations: ['user', 'event', 'ticket'],
      });

      if (!pass) {
        throw new NotFoundException('Pass not found');
      }

      // Check if pass allows sharing
      if (!this.canSharePass(pass)) {
        throw new BadRequestException('This pass cannot be shared');
      }

      // Check sharing limits
      const currentShares = pass.sharingInfo?.sharedWith?.length || 0;
      const maxShares = request.maxShares || 5;
      
      if (currentShares + request.shareWithEmails.length > maxShares) {
        throw new BadRequestException(`Sharing limit exceeded. Maximum ${maxShares} shares allowed.`);
      }

      // Generate share token
      const shareToken = this.generateShareToken();
      const shareUrl = this.generateShareUrl(shareToken);
      const expiresAt = request.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

      // Update pass sharing info
      const updatedSharingInfo = {
        sharedWith: [...(pass.sharingInfo?.sharedWith || []), ...request.shareWithEmails],
        shareToken,
        shareExpiresAt: expiresAt,
        allowSharing: true,
        shareMessage: request.shareMessage,
        allowForwarding: request.allowForwarding || false,
        maxShares,
        shareHistory: [
          ...(pass.sharingInfo?.shareHistory || []),
          {
            sharedAt: new Date(),
            sharedWith: request.shareWithEmails,
            shareToken,
            expiresAt,
          },
        ],
      };

      await this.passRepository.update(request.passId, {
        sharingInfo: updatedSharingInfo,
      });

      // Send share notifications
      await this.sendShareNotifications(pass, request, shareToken, shareUrl);

      // Track analytics
      await this.trackSharingAnalytics(request.passId, request.shareWithEmails.length);

      return {
        success: true,
        shareToken,
        shareUrl,
        sharedWith: request.shareWithEmails,
        expiresAt,
      };
    } catch (error) {
      this.logger.error(`Failed to share pass: ${error.message}`);
      return {
        success: false,
        shareToken: '',
        shareUrl: '',
        sharedWith: [],
        expiresAt: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Access shared pass using share token
   */
  async accessSharedPass(
    shareToken: string,
    accessInfo: {
      accessedBy: string;
      userAgent?: string;
      ipAddress?: string;
    }
  ): Promise<{
    success: boolean;
    pass?: WalletPass;
    canDownload: boolean;
    error?: string;
  }> {
    this.logger.log(`Accessing shared pass with token: ${shareToken.substring(0, 10)}...`);

    try {
      const pass = await this.passRepository.findOne({
        where: {
          sharingInfo: {
            shareToken,
          } as any,
        },
        relations: ['user', 'event', 'ticket'],
      });

      if (!pass) {
        throw new NotFoundException('Shared pass not found');
      }

      // Check if share token is still valid
      if (!this.isShareTokenValid(pass, shareToken)) {
        throw new BadRequestException('Share token has expired or is invalid');
      }

      // Check if accessor is authorized
      if (!this.isAccessorAuthorized(pass, accessInfo.accessedBy)) {
        throw new BadRequestException('You are not authorized to access this pass');
      }

      // Track access
      await this.trackPassAccess(pass.id, {
        shareToken,
        accessedBy: accessInfo.accessedBy,
        accessedAt: new Date(),
        deviceInfo: {
          userAgent: accessInfo.userAgent || '',
          ipAddress: accessInfo.ipAddress || '',
          deviceType: this.detectDeviceType(accessInfo.userAgent || ''),
        },
      });

      // Update access history
      await this.updateAccessHistory(pass.id, accessInfo);

      return {
        success: true,
        pass,
        canDownload: true,
      };
    } catch (error) {
      this.logger.error(`Failed to access shared pass: ${error.message}`);
      return {
        success: false,
        canDownload: false,
        error: error.message,
      };
    }
  }

  /**
   * Create group booking share configuration
   */
  async createGroupBookingShare(groupShare: GroupBookingShare): Promise<{
    success: boolean;
    groupShareId: string;
    shareUrls: Array<{ passId: string; shareUrl: string }>;
    error?: string;
  }> {
    this.logger.log(`Creating group booking share for ${groupShare.passIds.length} passes`);

    try {
      const passes = await this.passRepository.find({
        where: {
          id: { $in: groupShare.passIds } as any,
          eventId: groupShare.eventId,
        },
        relations: ['user', 'event'],
      });

      if (passes.length !== groupShare.passIds.length) {
        throw new BadRequestException('Some passes not found or do not belong to the specified event');
      }

      const groupShareId = this.generateGroupShareId();
      const shareUrls = [];

      // Configure sharing for each pass
      for (const pass of passes) {
        const shareToken = this.generateShareToken();
        const shareUrl = this.generateGroupShareUrl(groupShareId, shareToken);

        const groupSharingInfo = {
          ...pass.sharingInfo,
          groupId: groupShare.groupId,
          groupShareId,
          shareToken,
          allowSharing: groupShare.shareSettings.allowIndividualSharing,
          requireApproval: groupShare.shareSettings.requireApproval,
          maxShares: groupShare.shareSettings.maxSharesPerPass,
          shareExpiresAt: new Date(Date.now() + groupShare.shareSettings.shareExpiryHours * 60 * 60 * 1000),
          groupSettings: groupShare.shareSettings,
        };

        await this.passRepository.update(pass.id, {
          sharingInfo: groupSharingInfo,
        });

        shareUrls.push({
          passId: pass.id,
          shareUrl,
        });
      }

      return {
        success: true,
        groupShareId,
        shareUrls,
      };
    } catch (error) {
      this.logger.error(`Failed to create group booking share: ${error.message}`);
      return {
        success: false,
        groupShareId: '',
        shareUrls: [],
        error: error.message,
      };
    }
  }

  /**
   * Revoke pass sharing
   */
  async revokePassSharing(passId: string, revokeAll: boolean = false): Promise<{
    success: boolean;
    revokedShares: number;
    error?: string;
  }> {
    this.logger.log(`Revoking sharing for pass ${passId}`);

    try {
      const pass = await this.passRepository.findOne({ where: { id: passId } });
      if (!pass) {
        throw new NotFoundException('Pass not found');
      }

      const revokedShares = pass.sharingInfo?.sharedWith?.length || 0;

      if (revokeAll) {
        // Revoke all sharing
        await this.passRepository.update(passId, {
          sharingInfo: {
            ...pass.sharingInfo,
            allowSharing: false,
            shareToken: null,
            shareExpiresAt: new Date(), // Expire immediately
            revokedAt: new Date(),
            revokedBy: 'owner',
          },
        });
      } else {
        // Just disable new sharing
        await this.passRepository.update(passId, {
          sharingInfo: {
            ...pass.sharingInfo,
            allowSharing: false,
          },
        });
      }

      // Track revocation
      await this.trackSharingAnalytics(passId, -revokedShares, 'revoked');

      return {
        success: true,
        revokedShares,
      };
    } catch (error) {
      this.logger.error(`Failed to revoke pass sharing: ${error.message}`);
      return {
        success: false,
        revokedShares: 0,
        error: error.message,
      };
    }
  }

  /**
   * Get sharing analytics for a pass
   */
  async getSharingAnalytics(passId: string): Promise<{
    totalShares: number;
    activeShares: number;
    totalAccesses: number;
    uniqueAccessors: number;
    sharesByDay: Array<{ date: string; shares: number; accesses: number }>;
    topAccessors: Array<{ accessor: string; accesses: number; lastAccess: Date }>;
    deviceBreakdown: Array<{ deviceType: string; accesses: number }>;
  }> {
    const pass = await this.passRepository.findOne({ where: { id: passId } });
    if (!pass) {
      throw new NotFoundException('Pass not found');
    }

    const shareAnalytics = await this.analyticsRepository.find({
      where: {
        walletPassId: passId,
        eventType: AnalyticsEventType.PASS_SHARED,
      },
      order: { timestamp: 'DESC' },
    });

    const accessAnalytics = await this.analyticsRepository.find({
      where: {
        walletPassId: passId,
        eventType: AnalyticsEventType.PASS_VIEWED,
        eventData: { accessType: 'shared' } as any,
      },
      order: { timestamp: 'DESC' },
    });

    const totalShares = pass.sharingInfo?.sharedWith?.length || 0;
    const activeShares = this.isShareTokenValid(pass, pass.sharingInfo?.shareToken) ? totalShares : 0;
    const totalAccesses = accessAnalytics.length;
    const uniqueAccessors = new Set(accessAnalytics.map(a => a.eventData?.accessedBy).filter(Boolean)).size;

    // Group by day
    const sharesByDay = this.groupSharingByDay(shareAnalytics, accessAnalytics, 30);

    // Top accessors
    const accessorCounts = accessAnalytics.reduce((acc, access) => {
      const accessor = access.eventData?.accessedBy;
      if (accessor) {
        if (!acc[accessor]) {
          acc[accessor] = { accesses: 0, lastAccess: access.timestamp };
        }
        acc[accessor].accesses++;
        if (access.timestamp > acc[accessor].lastAccess) {
          acc[accessor].lastAccess = access.timestamp;
        }
      }
      return acc;
    }, {} as Record<string, { accesses: number; lastAccess: Date }>);

    const topAccessors = Object.entries(accessorCounts)
      .map(([accessor, data]) => ({ accessor, ...data }))
      .sort((a, b) => b.accesses - a.accesses)
      .slice(0, 10);

    // Device breakdown
    const deviceCounts = accessAnalytics.reduce((acc, access) => {
      const deviceType = access.deviceType || 'Unknown';
      acc[deviceType] = (acc[deviceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const deviceBreakdown = Object.entries(deviceCounts).map(([deviceType, accesses]) => ({
      deviceType,
      accesses,
    }));

    return {
      totalShares,
      activeShares,
      totalAccesses,
      uniqueAccessors,
      sharesByDay,
      topAccessors,
      deviceBreakdown,
    };
  }

  /**
   * Bulk share passes for group bookings
   */
  async bulkSharePasses(
    passIds: string[],
    shareRequest: Omit<SharePassRequest, 'passId'>
  ): Promise<{
    success: boolean;
    results: Array<{
      passId: string;
      success: boolean;
      shareUrl?: string;
      error?: string;
    }>;
    summary: {
      totalPasses: number;
      successfulShares: number;
      failedShares: number;
    };
  }> {
    this.logger.log(`Bulk sharing ${passIds.length} passes`);

    const results = [];
    let successfulShares = 0;
    let failedShares = 0;

    for (const passId of passIds) {
      try {
        const result = await this.sharePass({
          ...shareRequest,
          passId,
        });

        results.push({
          passId,
          success: result.success,
          shareUrl: result.shareUrl,
          error: result.error,
        });

        if (result.success) {
          successfulShares++;
        } else {
          failedShares++;
        }
      } catch (error) {
        results.push({
          passId,
          success: false,
          error: error.message,
        });
        failedShares++;
      }
    }

    return {
      success: failedShares === 0,
      results,
      summary: {
        totalPasses: passIds.length,
        successfulShares,
        failedShares,
      },
    };
  }

  // Private helper methods

  private canSharePass(pass: WalletPass): boolean {
    // Check if pass is active and not expired
    if (pass.status !== PassStatus.ACTIVE || pass.isExpired) {
      return false;
    }

    // Check if sharing is enabled in pass metadata
    const sharingSettings = pass.metadata?.sharingSettings;
    if (sharingSettings && !sharingSettings.allowSharing) {
      return false;
    }

    return true;
  }

  private generateShareToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateGroupShareId(): string {
    return `group_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateShareUrl(shareToken: string): string {
    return `https://wallet.veritix.com/shared/${shareToken}`;
  }

  private generateGroupShareUrl(groupShareId: string, shareToken: string): string {
    return `https://wallet.veritix.com/group/${groupShareId}/${shareToken}`;
  }

  private isShareTokenValid(pass: WalletPass, shareToken?: string): boolean {
    if (!shareToken || !pass.sharingInfo?.shareToken) {
      return false;
    }

    if (pass.sharingInfo.shareToken !== shareToken) {
      return false;
    }

    if (pass.sharingInfo.shareExpiresAt && new Date() > pass.sharingInfo.shareExpiresAt) {
      return false;
    }

    return true;
  }

  private isAccessorAuthorized(pass: WalletPass, accessorEmail: string): boolean {
    if (!pass.sharingInfo?.sharedWith) {
      return false;
    }

    return pass.sharingInfo.sharedWith.includes(accessorEmail);
  }

  private detectDeviceType(userAgent: string): string {
    if (/iPhone|iPad|iPod/.test(userAgent)) {
      return 'iOS';
    }
    if (/Android/.test(userAgent)) {
      return 'Android';
    }
    if (/Windows/.test(userAgent)) {
      return 'Windows';
    }
    if (/Mac/.test(userAgent)) {
      return 'Mac';
    }
    return 'Unknown';
  }

  private async sendShareNotifications(
    pass: WalletPass,
    request: SharePassRequest,
    shareToken: string,
    shareUrl: string
  ): Promise<void> {
    const notificationData = {
      passId: pass.id,
      eventName: pass.event.name,
      senderName: `${pass.user.firstName} ${pass.user.lastName}`,
      shareUrl,
      shareMessage: request.shareMessage,
      recipients: request.shareWithEmails,
      expiresAt: request.expiresAt,
    };

    await this.sharingQueue.add('send-share-notifications', notificationData);
  }

  private async trackSharingAnalytics(
    passId: string,
    shareCount: number,
    action: 'shared' | 'revoked' = 'shared'
  ): Promise<void> {
    try {
      await this.analyticsRepository.save({
        walletPassId: passId,
        eventType: AnalyticsEventType.PASS_SHARED,
        timestamp: new Date(),
        eventData: {
          shareCount,
          action,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to track sharing analytics: ${error.message}`);
    }
  }

  private async trackPassAccess(passId: string, accessInfo: SharedPassAccess): Promise<void> {
    try {
      await this.analyticsRepository.save({
        walletPassId: passId,
        eventType: AnalyticsEventType.PASS_VIEWED,
        timestamp: new Date(),
        deviceType: accessInfo.deviceInfo?.deviceType,
        userAgent: accessInfo.deviceInfo?.userAgent,
        ipAddress: accessInfo.deviceInfo?.ipAddress,
        eventData: {
          accessType: 'shared',
          accessedBy: accessInfo.accessedBy,
          shareToken: accessInfo.shareToken,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to track pass access: ${error.message}`);
    }
  }

  private async updateAccessHistory(passId: string, accessInfo: any): Promise<void> {
    const pass = await this.passRepository.findOne({ where: { id: passId } });
    if (!pass) return;

    const accessHistory = pass.sharingInfo?.accessHistory || [];
    accessHistory.push({
      accessedBy: accessInfo.accessedBy,
      accessedAt: new Date(),
      userAgent: accessInfo.userAgent,
      ipAddress: accessInfo.ipAddress,
    });

    // Keep only last 100 access records
    const recentAccessHistory = accessHistory.slice(-100);

    await this.passRepository.update(passId, {
      sharingInfo: {
        ...pass.sharingInfo,
        accessHistory: recentAccessHistory,
        lastAccessedAt: new Date(),
      },
    });
  }

  private groupSharingByDay(
    shareAnalytics: PassAnalytics[],
    accessAnalytics: PassAnalytics[],
    days: number
  ): Array<{ date: string; shares: number; accesses: number }> {
    const dayMap = new Map<string, { shares: number; accesses: number }>();

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dayMap.set(dateStr, { shares: 0, accesses: 0 });
    }

    // Count shares by day
    shareAnalytics.forEach(analytics => {
      const dateStr = analytics.timestamp.toISOString().split('T')[0];
      if (dayMap.has(dateStr)) {
        dayMap.get(dateStr)!.shares += analytics.eventData?.shareCount || 1;
      }
    });

    // Count accesses by day
    accessAnalytics.forEach(analytics => {
      const dateStr = analytics.timestamp.toISOString().split('T')[0];
      if (dayMap.has(dateStr)) {
        dayMap.get(dateStr)!.accesses++;
      }
    });

    // Convert to array and sort by date
    return Array.from(dayMap.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
