import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VirtualEvent } from '../entities/virtual-event.entity';
import { VirtualEventAttendee } from '../entities/virtual-event-attendee.entity';
import { VirtualEventInteraction } from '../entities/virtual-event-interaction.entity';
import { VirtualEventRecording } from '../entities/virtual-event-recording.entity';
import { BreakoutRoom } from '../entities/breakout-room.entity';

@Injectable()
export class VirtualAnalyticsService {
  private readonly logger = new Logger(VirtualAnalyticsService.name);

  constructor(
    @InjectRepository(VirtualEvent)
    private readonly virtualEventRepository: Repository<VirtualEvent>,
    @InjectRepository(VirtualEventAttendee)
    private readonly attendeeRepository: Repository<VirtualEventAttendee>,
    @InjectRepository(VirtualEventInteraction)
    private readonly interactionRepository: Repository<VirtualEventInteraction>,
    @InjectRepository(VirtualEventRecording)
    private readonly recordingRepository: Repository<VirtualEventRecording>,
    @InjectRepository(BreakoutRoom)
    private readonly breakoutRoomRepository: Repository<BreakoutRoom>,
  ) {}

  async getEventAnalytics(virtualEventId: string): Promise<any> {
    const event = await this.virtualEventRepository.findOne({
      where: { id: virtualEventId },
    });

    if (!event) {
      throw new Error('Virtual event not found');
    }

    const [
      attendeeStats,
      interactionStats,
      engagementStats,
      recordingStats,
      breakoutRoomStats,
    ] = await Promise.all([
      this.getAttendeeAnalytics(virtualEventId),
      this.getInteractionAnalytics(virtualEventId),
      this.getEngagementAnalytics(virtualEventId),
      this.getRecordingAnalytics(virtualEventId),
      this.getBreakoutRoomAnalytics(virtualEventId),
    ]);

    return {
      eventId: virtualEventId,
      eventType: event.eventType,
      platform: event.streamingPlatform,
      status: event.status,
      duration: this.calculateEventDuration(event),
      attendees: attendeeStats,
      interactions: interactionStats,
      engagement: engagementStats,
      recordings: recordingStats,
      breakoutRooms: breakoutRoomStats,
      generatedAt: new Date(),
    };
  }

  async getAttendeeAnalytics(virtualEventId: string): Promise<any> {
    const totalAttendees = await this.attendeeRepository.count({
      where: { virtualEventId },
    });

    const currentAttendees = await this.attendeeRepository.count({
      where: { virtualEventId, leftAt: null },
    });

    const attendeeDurations = await this.attendeeRepository
      .createQueryBuilder('attendee')
      .select('AVG(attendee.totalDuration)', 'avgDuration')
      .addSelect('MAX(attendee.totalDuration)', 'maxDuration')
      .addSelect('MIN(attendee.totalDuration)', 'minDuration')
      .where('attendee.virtualEventId = :virtualEventId', { virtualEventId })
      .andWhere('attendee.totalDuration > 0')
      .getRawOne();

    const joinTimes = await this.attendeeRepository
      .createQueryBuilder('attendee')
      .select('DATE_TRUNC(\'hour\', attendee.joinedAt)', 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('attendee.virtualEventId = :virtualEventId', { virtualEventId })
      .groupBy('DATE_TRUNC(\'hour\', attendee.joinedAt)')
      .orderBy('hour', 'ASC')
      .getRawMany();

    const deviceInfo = await this.attendeeRepository
      .createQueryBuilder('attendee')
      .select('attendee.deviceInfo->\'platform\'', 'platform')
      .addSelect('COUNT(*)', 'count')
      .where('attendee.virtualEventId = :virtualEventId', { virtualEventId })
      .andWhere('attendee.deviceInfo IS NOT NULL')
      .groupBy('attendee.deviceInfo->\'platform\'')
      .getRawMany();

    return {
      total: totalAttendees,
      current: currentAttendees,
      averageDuration: parseInt(attendeeDurations?.avgDuration) || 0,
      maxDuration: parseInt(attendeeDurations?.maxDuration) || 0,
      minDuration: parseInt(attendeeDurations?.minDuration) || 0,
      joinPattern: joinTimes.map(item => ({
        hour: item.hour,
        count: parseInt(item.count),
      })),
      deviceBreakdown: deviceInfo.map(item => ({
        platform: item.platform,
        count: parseInt(item.count),
      })),
    };
  }

  async getInteractionAnalytics(virtualEventId: string): Promise<any> {
    const totalInteractions = await this.interactionRepository.count({
      where: { virtualEventId },
    });

    const interactionsByType = await this.interactionRepository
      .createQueryBuilder('interaction')
      .select('interaction.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('interaction.virtualEventId = :virtualEventId', { virtualEventId })
      .groupBy('interaction.type')
      .getRawMany();

    const interactionTimeline = await this.interactionRepository
      .createQueryBuilder('interaction')
      .select('DATE_TRUNC(\'minute\', interaction.createdAt)', 'minute')
      .addSelect('COUNT(*)', 'count')
      .where('interaction.virtualEventId = :virtualEventId', { virtualEventId })
      .groupBy('DATE_TRUNC(\'minute\', interaction.createdAt)')
      .orderBy('minute', 'ASC')
      .getRawMany();

    const topParticipants = await this.interactionRepository
      .createQueryBuilder('interaction')
      .leftJoin('interaction.user', 'user')
      .select('user.id', 'userId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('COUNT(*)', 'interactionCount')
      .where('interaction.virtualEventId = :virtualEventId', { virtualEventId })
      .andWhere('interaction.userId IS NOT NULL')
      .groupBy('user.id, user.firstName, user.lastName')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      total: totalInteractions,
      byType: interactionsByType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {}),
      timeline: interactionTimeline.map(item => ({
        minute: item.minute,
        count: parseInt(item.count),
      })),
      topParticipants: topParticipants.map(item => ({
        userId: item.userId,
        name: `${item.firstName} ${item.lastName}`,
        interactionCount: parseInt(item.interactionCount),
      })),
    };
  }

  async getEngagementAnalytics(virtualEventId: string): Promise<any> {
    const attendeesWithInteractions = await this.attendeeRepository
      .createQueryBuilder('attendee')
      .leftJoin('attendee.user', 'user')
      .leftJoin(
        'virtual_event_interaction',
        'interaction',
        'interaction.userId = user.id AND interaction.virtualEventId = :virtualEventId',
        { virtualEventId }
      )
      .select('attendee.id', 'attendeeId')
      .addSelect('COUNT(interaction.id)', 'interactionCount')
      .addSelect('attendee.totalDuration', 'duration')
      .where('attendee.virtualEventId = :virtualEventId', { virtualEventId })
      .groupBy('attendee.id, attendee.totalDuration')
      .getRawMany();

    const engagementScores = attendeesWithInteractions.map(attendee => {
      const interactionScore = parseInt(attendee.interactionCount) * 10;
      const durationScore = Math.min(attendee.duration / 60, 100); // Max 100 points for duration
      return {
        attendeeId: attendee.attendeeId,
        engagementScore: interactionScore + durationScore,
        interactionCount: parseInt(attendee.interactionCount),
        duration: attendee.duration,
      };
    });

    const avgEngagement = engagementScores.reduce((sum, score) => sum + score.engagementScore, 0) / engagementScores.length || 0;
    
    const engagementLevels = {
      high: engagementScores.filter(score => score.engagementScore > avgEngagement * 1.5).length,
      medium: engagementScores.filter(score => score.engagementScore >= avgEngagement * 0.5 && score.engagementScore <= avgEngagement * 1.5).length,
      low: engagementScores.filter(score => score.engagementScore < avgEngagement * 0.5).length,
    };

    return {
      averageEngagementScore: Math.round(avgEngagement),
      engagementLevels,
      totalEngagedUsers: engagementScores.filter(score => score.interactionCount > 0).length,
      engagementRate: (engagementScores.filter(score => score.interactionCount > 0).length / engagementScores.length) * 100 || 0,
    };
  }

  async getRecordingAnalytics(virtualEventId: string): Promise<any> {
    const recordings = await this.recordingRepository.find({
      where: { virtualEventId },
    });

    const totalViews = recordings.reduce((sum, recording) => sum + recording.viewCount, 0);
    const totalDownloads = recordings.reduce((sum, recording) => sum + recording.downloadCount, 0);
    const totalDuration = recordings.reduce((sum, recording) => sum + recording.duration, 0);

    return {
      totalRecordings: recordings.length,
      totalViews,
      totalDownloads,
      totalDuration,
      averageViews: recordings.length > 0 ? Math.round(totalViews / recordings.length) : 0,
      recordings: recordings.map(recording => ({
        id: recording.id,
        title: recording.title,
        duration: recording.duration,
        views: recording.viewCount,
        downloads: recording.downloadCount,
        status: recording.status,
      })),
    };
  }

  async getBreakoutRoomAnalytics(virtualEventId: string): Promise<any> {
    const breakoutRooms = await this.breakoutRoomRepository.find({
      where: { virtualEventId },
    });

    const totalSessions = breakoutRooms.filter(room => room.actualStartTime).length;
    const totalDuration = breakoutRooms.reduce((sum, room) => sum + room.totalDuration, 0);
    const averageParticipants = breakoutRooms.reduce((sum, room) => sum + room.currentParticipants, 0) / breakoutRooms.length || 0;

    return {
      totalRooms: breakoutRooms.length,
      totalSessions,
      totalDuration,
      averageParticipants: Math.round(averageParticipants),
      rooms: breakoutRooms.map(room => ({
        id: room.id,
        name: room.name,
        participants: room.currentParticipants,
        duration: room.totalDuration,
        status: room.status,
      })),
    };
  }

  async getRealtimeMetrics(virtualEventId: string): Promise<any> {
    const currentAttendees = await this.attendeeRepository.count({
      where: { virtualEventId, leftAt: null },
    });

    const recentInteractions = await this.interactionRepository.count({
      where: {
        virtualEventId,
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
      },
    });

    const activeBreakoutRooms = await this.breakoutRoomRepository.count({
      where: { virtualEventId, currentParticipants: { $gt: 0 } },
    });

    return {
      currentAttendees,
      recentInteractions,
      activeBreakoutRooms,
      timestamp: new Date(),
    };
  }

  private calculateEventDuration(event: VirtualEvent): number {
    if (event.actualStartTime && event.actualEndTime) {
      return Math.floor((event.actualEndTime.getTime() - event.actualStartTime.getTime()) / 1000);
    }
    if (event.actualStartTime && event.isLive) {
      return Math.floor((new Date().getTime() - event.actualStartTime.getTime()) / 1000);
    }
    return 0;
  }
}
