import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import {
  FunnelAction,
  FunnelStage,
  FunnelActionType,
} from '../entities/funnel-action.entity';
import {
  FunnelSession,
  FunnelSessionStatus,
} from '../entities/funnel-session.entity';
import { FunnelStats } from '../entities/funnel-stats.entity';
import { TrackFunnelActionDto } from '../dto/track-funnel-action.dto';
import {
  FunnelStatsResponseDto,
  FunnelStageStatsDto,
} from '../dto/funnel-stats.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FunnelTrackingService {
  private readonly logger = new Logger(FunnelTrackingService.name);

  constructor(
    @InjectRepository(FunnelAction)
    private funnelActionRepository: Repository<FunnelAction>,
    @InjectRepository(FunnelSession)
    private funnelSessionRepository: Repository<FunnelSession>,
    @InjectRepository(FunnelStats)
    private funnelStatsRepository: Repository<FunnelStats>,
  ) {}

  /**
   * Create or get existing session for a user/event combination
   */
  async getOrCreateSession(
    eventId: string,
    userId?: string,
    sessionData?: {
      ipAddress?: string;
      userAgent?: string;
      trafficSource?: string;
      referrerUrl?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmTerm?: string;
      utmContent?: string;
      deviceType?: string;
      browser?: string;
      operatingSystem?: string;
      country?: string;
      city?: string;
    },
  ): Promise<FunnelSession> {
    // Check for existing active session
    const whereCondition: any = {
      eventId,
      status: FunnelSessionStatus.ACTIVE,
    };

    if (userId) {
      whereCondition.userId = userId;
    } else {
      whereCondition.userId = null;
    }

    const existingSession = await this.funnelSessionRepository.findOne({
      where: whereCondition,
      order: { createdAt: 'DESC' },
    });

    if (existingSession) {
      // Update session with new data if provided
      if (sessionData) {
        Object.assign(existingSession, sessionData);
        await this.funnelSessionRepository.save(existingSession);
      }
      return existingSession;
    }

    // Create new session
    const session = this.funnelSessionRepository.create({
      id: uuidv4(),
      eventId,
      userId,
      status: FunnelSessionStatus.ACTIVE,
      ...sessionData,
    });

    return this.funnelSessionRepository.save(session);
  }

  /**
   * Track a funnel action
   */
  async trackAction(
    trackActionDto: TrackFunnelActionDto,
  ): Promise<FunnelAction> {
    const action = this.funnelActionRepository.create({
      ...trackActionDto,
      id: uuidv4(),
    });

    const savedAction = await this.funnelActionRepository.save(action);

    // Update session stats
    await this.updateSessionStats(trackActionDto.sessionId);

    // Update daily stats
    await this.updateDailyStats(trackActionDto.eventId, trackActionDto.stage);

    this.logger.log(
      `Tracked funnel action: ${trackActionDto.stage} - ${trackActionDto.actionType}`,
    );

    return savedAction;
  }

  /**
   * Complete a session (mark as completed)
   */
  async completeSession(
    sessionId: string,
    purchaseId?: string,
    totalSpent?: number,
  ): Promise<void> {
    await this.funnelSessionRepository.update(sessionId, {
      status: FunnelSessionStatus.COMPLETED,
      purchaseId,
      totalSpent,
      completedAt: new Date(),
    });

    this.logger.log(`Completed funnel session: ${sessionId}`);
  }

  /**
   * Abandon a session
   */
  async abandonSession(sessionId: string): Promise<void> {
    await this.funnelSessionRepository.update(sessionId, {
      status: FunnelSessionStatus.ABANDONED,
      abandonedAt: new Date(),
    });

    this.logger.log(`Abandoned funnel session: ${sessionId}`);
  }

  /**
   * Get funnel statistics for an event
   */
  async getFunnelStats(
    eventId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<FunnelStatsResponseDto> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const [sessions, actions, stageStats] = await Promise.all([
      this.funnelSessionRepository.find({
        where: { eventId, ...dateFilter },
      }),
      this.funnelActionRepository.find({
        where: { eventId, ...dateFilter },
      }),
      this.getStageStats(eventId, startDate, endDate),
    ]);

    const totalSessions = sessions.length;
    const totalRevenue = sessions
      .filter((s) => s.totalSpent)
      .reduce((sum, s) => sum + Number(s.totalSpent), 0);
    const completedSessions = sessions.filter(
      (s) => s.status === FunnelSessionStatus.COMPLETED,
    );
    const overallConversionRate =
      totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0;

    const summary = await this.getSummaryStats(eventId, startDate, endDate);

    return {
      eventId,
      eventName: 'Event Name', // TODO: Get from event service
      dateRange: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: endDate || new Date(),
      },
      totalSessions,
      totalRevenue,
      overallConversionRate,
      stages: stageStats,
      summary,
    };
  }

  /**
   * Get stage-specific statistics
   */
  private async getStageStats(
    eventId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<FunnelStageStatsDto[]> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const stageStats = await this.funnelActionRepository
      .createQueryBuilder('action')
      .select([
        'action.stage as stage',
        'COUNT(DISTINCT action.sessionId) as totalSessions',
        'COUNT(action.id) as totalActions',
        'COUNT(DISTINCT action.userId) as uniqueUsers',
        'AVG(action.timeOnPage) as avgTimeSpent',
        'SUM(action.timeOnPage) as totalTimeSpent',
      ])
      .where('action.eventId = :eventId', { eventId })
      .andWhere(dateFilter)
      .groupBy('action.stage')
      .getRawMany();

    return stageStats.map((stat) => ({
      stage: stat.stage as FunnelStage,
      totalSessions: parseInt(stat.totalSessions),
      totalActions: parseInt(stat.totalActions),
      uniqueUsers: parseInt(stat.uniqueUsers),
      conversions: parseInt(stat.totalSessions), // For now, sessions that reached this stage
      conversionRate: 0, // Will be calculated
      dropoffRate: 0, // Will be calculated
      avgTimeSpent: parseInt(stat.avgTimeSpent) || 0,
      totalTimeSpent: parseInt(stat.totalTimeSpent) || 0,
      totalRevenue: 0, // Will be calculated from completed sessions
      trafficSourceBreakdown: {},
      deviceBreakdown: {},
      countryBreakdown: {},
      utmBreakdown: {},
    }));
  }

  /**
   * Get summary statistics
   */
  private async getSummaryStats(
    eventId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const [
      totalViews,
      totalPurchases,
      avgSessionDuration,
      trafficSources,
      countries,
    ] = await Promise.all([
      this.funnelActionRepository.count({
        where: {
          eventId,
          stage: FunnelStage.EVENT_VIEW,
          ...dateFilter,
        },
      }),
      this.funnelSessionRepository.count({
        where: {
          eventId,
          status: FunnelSessionStatus.COMPLETED,
          ...dateFilter,
        },
      }),
      this.funnelSessionRepository
        .createQueryBuilder('session')
        .select('AVG(session.totalTimeSpent)', 'avgDuration')
        .where('session.eventId = :eventId', { eventId })
        .andWhere(dateFilter)
        .getRawOne(),
      this.funnelActionRepository
        .createQueryBuilder('action')
        .select('action.trafficSource', 'source')
        .addSelect('COUNT(*)', 'count')
        .where('action.eventId = :eventId', { eventId })
        .andWhere(dateFilter)
        .andWhere('action.trafficSource IS NOT NULL')
        .groupBy('action.trafficSource')
        .orderBy('count', 'DESC')
        .limit(5)
        .getRawMany(),
      this.funnelActionRepository
        .createQueryBuilder('action')
        .select('action.country', 'country')
        .addSelect('COUNT(*)', 'count')
        .where('action.eventId = :eventId', { eventId })
        .andWhere(dateFilter)
        .andWhere('action.country IS NOT NULL')
        .groupBy('action.country')
        .orderBy('count', 'DESC')
        .limit(5)
        .getRawMany(),
    ]);

    return {
      totalViews,
      totalPurchases,
      avgSessionDuration: parseInt(avgSessionDuration?.avgDuration) || 0,
      topTrafficSources: trafficSources.map((t) => ({
        source: t.source,
        count: parseInt(t.count),
      })),
      topCountries: countries.map((c) => ({
        country: c.country,
        count: parseInt(c.count),
      })),
    };
  }

  /**
   * Update session statistics
   */
  private async updateSessionStats(sessionId: string): Promise<void> {
    const [actionCount, totalTime] = await Promise.all([
      this.funnelActionRepository.count({ where: { sessionId } }),
      this.funnelActionRepository
        .createQueryBuilder('action')
        .select('SUM(action.timeOnPage)', 'totalTime')
        .where('action.sessionId = :sessionId', { sessionId })
        .getRawOne(),
    ]);

    await this.funnelSessionRepository.update(sessionId, {
      totalActions: actionCount,
      totalTimeSpent: parseInt(totalTime?.totalTime) || 0,
    });
  }

  /**
   * Update daily statistics
   */
  private async updateDailyStats(
    eventId: string,
    stage: FunnelStage,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let stats = await this.funnelStatsRepository.findOne({
      where: { eventId, stage, date: today },
    });

    if (!stats) {
      stats = this.funnelStatsRepository.create({
        eventId,
        stage,
        date: today,
      });
    }

    // Update counts
    const [sessions, actions, uniqueUsers] = await Promise.all([
      this.funnelActionRepository.count({
        where: {
          eventId,
          stage,
          createdAt: Between(
            today,
            new Date(today.getTime() + 24 * 60 * 60 * 1000),
          ),
        },
      }),
      this.funnelActionRepository.count({
        where: {
          eventId,
          stage,
          createdAt: Between(
            today,
            new Date(today.getTime() + 24 * 60 * 60 * 1000),
          ),
        },
      }),
      this.funnelActionRepository
        .createQueryBuilder('action')
        .select('COUNT(DISTINCT action.userId)', 'uniqueUsers')
        .where('action.eventId = :eventId', { eventId })
        .andWhere('action.stage = :stage', { stage })
        .andWhere('action.createdAt >= :start', { start: today })
        .andWhere('action.createdAt < :end', {
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        })
        .getRawOne(),
    ]);

    stats.totalSessions = sessions;
    stats.totalActions = actions;
    stats.uniqueUsers = parseInt(uniqueUsers?.uniqueUsers) || 0;

    await this.funnelStatsRepository.save(stats);
  }

  /**
   * Build date filter for queries
   */
  private buildDateFilter(startDate?: Date, endDate?: Date) {
    const filter: any = {};

    if (startDate) {
      filter.createdAt = MoreThanOrEqual(startDate);
    }

    if (endDate) {
      if (filter.createdAt) {
        filter.createdAt = Between(startDate, endDate);
      } else {
        filter.createdAt = LessThanOrEqual(endDate);
      }
    }

    return filter;
  }
}
