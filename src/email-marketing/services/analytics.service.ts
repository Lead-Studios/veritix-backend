import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EmailCampaign } from '../entities/email-campaign.entity';
import { EmailDelivery, DeliveryStatus } from '../entities/email-delivery.entity';
import { EmailOpen } from '../entities/email-open.entity';
import { EmailClick } from '../entities/email-click.entity';
import { EmailBounce, BounceType } from '../entities/email-bounce.entity';
import { AutomationWorkflow } from '../entities/automation-workflow.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(EmailCampaign)
    private campaignRepository: Repository<EmailCampaign>,
    @InjectRepository(EmailDelivery)
    private deliveryRepository: Repository<EmailDelivery>,
    @InjectRepository(EmailOpen)
    private openRepository: Repository<EmailOpen>,
    @InjectRepository(EmailClick)
    private clickRepository: Repository<EmailClick>,
    @InjectRepository(EmailBounce)
    private bounceRepository: Repository<EmailBounce>,
    @InjectRepository(AutomationWorkflow)
    private workflowRepository: Repository<AutomationWorkflow>,
  ) {}

  async getCampaignAnalytics(campaignId: string): Promise<{
    overview: {
      sent: number;
      delivered: number;
      bounced: number;
      opened: number;
      clicked: number;
      unsubscribed: number;
      openRate: number;
      clickRate: number;
      clickToOpenRate: number;
      bounceRate: number;
      unsubscribeRate: number;
    };
    timeSeriesData: Array<{
      date: string;
      opens: number;
      clicks: number;
      bounces: number;
    }>;
    deviceBreakdown: Array<{
      deviceType: string;
      opens: number;
      clicks: number;
      percentage: number;
    }>;
    locationBreakdown: Array<{
      location: string;
      opens: number;
      clicks: number;
      percentage: number;
    }>;
    linkPerformance: Array<{
      url: string;
      clicks: number;
      uniqueClicks: number;
      clickRate: number;
    }>;
  }> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get overview metrics
    const deliveryStats = await this.deliveryRepository
      .createQueryBuilder('delivery')
      .leftJoin('delivery.opens', 'opens')
      .leftJoin('delivery.clicks', 'clicks')
      .leftJoin('delivery.bounces', 'bounces')
      .where('delivery.campaignId = :campaignId', { campaignId })
      .select([
        'COUNT(delivery.id) as sent',
        'COUNT(CASE WHEN delivery.status = :delivered THEN 1 END) as delivered',
        'COUNT(CASE WHEN delivery.status = :bounced THEN 1 END) as bounced',
        'COUNT(DISTINCT opens.deliveryId) as opened',
        'COUNT(DISTINCT clicks.deliveryId) as clicked',
        'COUNT(CASE WHEN delivery.unsubscribedAt IS NOT NULL THEN 1 END) as unsubscribed',
      ])
      .setParameters({
        delivered: DeliveryStatus.DELIVERED,
        bounced: DeliveryStatus.BOUNCED,
      })
      .getRawOne();

    const sent = parseInt(deliveryStats.sent) || 0;
    const delivered = parseInt(deliveryStats.delivered) || 0;
    const bounced = parseInt(deliveryStats.bounced) || 0;
    const opened = parseInt(deliveryStats.opened) || 0;
    const clicked = parseInt(deliveryStats.clicked) || 0;
    const unsubscribed = parseInt(deliveryStats.unsubscribed) || 0;

    const overview = {
      sent,
      delivered,
      bounced,
      opened,
      clicked,
      unsubscribed,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
      clickToOpenRate: opened > 0 ? (clicked / opened) * 100 : 0,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
      unsubscribeRate: delivered > 0 ? (unsubscribed / delivered) * 100 : 0,
    };

    // Get time series data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const timeSeriesData = await this.getTimeSeriesData(campaignId, thirtyDaysAgo, new Date());

    // Get device breakdown
    const deviceBreakdown = await this.getDeviceBreakdown(campaignId);

    // Get location breakdown
    const locationBreakdown = await this.getLocationBreakdown(campaignId);

    // Get link performance
    const linkPerformance = await this.getLinkPerformance(campaignId);

    return {
      overview,
      timeSeriesData,
      deviceBreakdown,
      locationBreakdown,
      linkPerformance,
    };
  }

  async getDashboardMetrics(dateRange: { startDate: Date; endDate: Date }): Promise<{
    totalCampaigns: number;
    activeCampaigns: number;
    totalEmailsSent: number;
    averageOpenRate: number;
    averageClickRate: number;
    totalRevenue: number;
    topPerformingCampaigns: Array<{
      id: string;
      name: string;
      openRate: number;
      clickRate: number;
      sent: number;
    }>;
    recentActivity: Array<{
      type: string;
      description: string;
      timestamp: Date;
      campaignId?: string;
      campaignName?: string;
    }>;
  }> {
    const { startDate, endDate } = dateRange;

    // Get campaign counts
    const totalCampaigns = await this.campaignRepository.count({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    const activeCampaigns = await this.campaignRepository.count({
      where: {
        status: 'active' as any,
        createdAt: Between(startDate, endDate),
      },
    });

    // Get email metrics
    const emailMetrics = await this.deliveryRepository
      .createQueryBuilder('delivery')
      .leftJoin('delivery.opens', 'opens')
      .leftJoin('delivery.clicks', 'clicks')
      .leftJoin('delivery.campaign', 'campaign')
      .where('delivery.sentAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select([
        'COUNT(delivery.id) as totalSent',
        'COUNT(CASE WHEN delivery.status = :delivered THEN 1 END) as totalDelivered',
        'COUNT(DISTINCT opens.deliveryId) as totalOpened',
        'COUNT(DISTINCT clicks.deliveryId) as totalClicked',
      ])
      .setParameter('delivered', DeliveryStatus.DELIVERED)
      .getRawOne();

    const totalEmailsSent = parseInt(emailMetrics.totalSent) || 0;
    const totalDelivered = parseInt(emailMetrics.totalDelivered) || 0;
    const totalOpened = parseInt(emailMetrics.totalOpened) || 0;
    const totalClicked = parseInt(emailMetrics.totalClicked) || 0;

    const averageOpenRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
    const averageClickRate = totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0;

    // Get top performing campaigns
    const topPerformingCampaigns = await this.getTopPerformingCampaigns(startDate, endDate, 5);

    // Get recent activity
    const recentActivity = await this.getRecentActivity(10);

    return {
      totalCampaigns,
      activeCampaigns,
      totalEmailsSent,
      averageOpenRate,
      averageClickRate,
      totalRevenue: 0, // This would be calculated based on your revenue tracking
      topPerformingCampaigns,
      recentActivity,
    };
  }

  async getAutomationAnalytics(workflowId: string): Promise<{
    overview: {
      totalExecutions: number;
      successfulExecutions: number;
      failedExecutions: number;
      successRate: number;
      averageExecutionTime: number;
    };
    triggerPerformance: Array<{
      triggerId: string;
      triggerType: string;
      executionCount: number;
      lastExecutedAt: Date;
    }>;
    actionPerformance: Array<{
      actionId: string;
      actionType: string;
      executionCount: number;
      errorCount: number;
      successRate: number;
      averageExecutionTime: number;
    }>;
    conversionFunnel: Array<{
      step: string;
      count: number;
      conversionRate: number;
    }>;
  }> {
    const workflow = await this.workflowRepository.findOne({
      where: { id: workflowId },
      relations: ['triggers', 'actions'],
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Calculate overview metrics
    const totalExecutions = workflow.executionCount || 0;
    const successfulExecutions = Math.floor(totalExecutions * 0.95); // Mock calculation
    const failedExecutions = totalExecutions - successfulExecutions;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    const overview = {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate,
      averageExecutionTime: 1500, // Mock value in milliseconds
    };

    // Get trigger performance
    const triggerPerformance = workflow.triggers.map(trigger => ({
      triggerId: trigger.id,
      triggerType: trigger.triggerType,
      executionCount: trigger.executionCount || 0,
      lastExecutedAt: trigger.lastExecutedAt,
    }));

    // Get action performance
    const actionPerformance = workflow.actions.map(action => ({
      actionId: action.id,
      actionType: action.actionType,
      executionCount: action.executionCount || 0,
      errorCount: action.errorCount || 0,
      successRate: action.executionCount > 0 
        ? ((action.executionCount - (action.errorCount || 0)) / action.executionCount) * 100 
        : 0,
      averageExecutionTime: 800, // Mock value
    }));

    // Mock conversion funnel
    const conversionFunnel = [
      { step: 'Triggered', count: totalExecutions, conversionRate: 100 },
      { step: 'Email Sent', count: Math.floor(totalExecutions * 0.95), conversionRate: 95 },
      { step: 'Email Opened', count: Math.floor(totalExecutions * 0.25), conversionRate: 26.3 },
      { step: 'Link Clicked', count: Math.floor(totalExecutions * 0.05), conversionRate: 20 },
      { step: 'Goal Completed', count: Math.floor(totalExecutions * 0.02), conversionRate: 40 },
    ];

    return {
      overview,
      triggerPerformance,
      actionPerformance,
      conversionFunnel,
    };
  }

  async getSegmentAnalytics(segmentId: string): Promise<{
    overview: {
      totalUsers: number;
      activeUsers: number;
      engagementRate: number;
      averageOpenRate: number;
      averageClickRate: number;
    };
    campaignPerformance: Array<{
      campaignId: string;
      campaignName: string;
      sent: number;
      opened: number;
      clicked: number;
      openRate: number;
      clickRate: number;
    }>;
    userActivity: Array<{
      date: string;
      newUsers: number;
      activeUsers: number;
      churnedUsers: number;
    }>;
  }> {
    // This would integrate with your user segment system
    // Mock implementation for now
    return {
      overview: {
        totalUsers: 1500,
        activeUsers: 1200,
        engagementRate: 80,
        averageOpenRate: 25.5,
        averageClickRate: 4.2,
      },
      campaignPerformance: [],
      userActivity: [],
    };
  }

  private async getTimeSeriesData(
    campaignId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<Array<{ date: string; opens: number; clicks: number; bounces: number }>> {
    const data = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const [opens, clicks, bounces] = await Promise.all([
        this.openRepository.count({
          where: {
            delivery: { campaignId },
            openedAt: Between(currentDate, nextDate),
          },
        }),
        this.clickRepository.count({
          where: {
            delivery: { campaignId },
            clickedAt: Between(currentDate, nextDate),
          },
        }),
        this.bounceRepository.count({
          where: {
            delivery: { campaignId },
            bouncedAt: Between(currentDate, nextDate),
          },
        }),
      ]);

      data.push({ date: dateStr, opens, clicks, bounces });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  private async getDeviceBreakdown(campaignId: string): Promise<Array<{
    deviceType: string;
    opens: number;
    clicks: number;
    percentage: number;
  }>> {
    const deviceData = await this.openRepository
      .createQueryBuilder('open')
      .leftJoin('open.delivery', 'delivery')
      .where('delivery.campaignId = :campaignId', { campaignId })
      .groupBy('open.deviceType')
      .select([
        'open.deviceType as deviceType',
        'COUNT(open.id) as opens',
      ])
      .getRawMany();

    const totalOpens = deviceData.reduce((sum, item) => sum + parseInt(item.opens), 0);

    return deviceData.map(item => ({
      deviceType: item.deviceType || 'Unknown',
      opens: parseInt(item.opens),
      clicks: 0, // Would need to join with clicks table
      percentage: totalOpens > 0 ? (parseInt(item.opens) / totalOpens) * 100 : 0,
    }));
  }

  private async getLocationBreakdown(campaignId: string): Promise<Array<{
    location: string;
    opens: number;
    clicks: number;
    percentage: number;
  }>> {
    const locationData = await this.openRepository
      .createQueryBuilder('open')
      .leftJoin('open.delivery', 'delivery')
      .where('delivery.campaignId = :campaignId', { campaignId })
      .groupBy('open.location')
      .select([
        'open.location as location',
        'COUNT(open.id) as opens',
      ])
      .getRawMany();

    const totalOpens = locationData.reduce((sum, item) => sum + parseInt(item.opens), 0);

    return locationData.map(item => ({
      location: item.location || 'Unknown',
      opens: parseInt(item.opens),
      clicks: 0, // Would need to join with clicks table
      percentage: totalOpens > 0 ? (parseInt(item.opens) / totalOpens) * 100 : 0,
    }));
  }

  private async getLinkPerformance(campaignId: string): Promise<Array<{
    url: string;
    clicks: number;
    uniqueClicks: number;
    clickRate: number;
  }>> {
    const linkData = await this.clickRepository
      .createQueryBuilder('click')
      .leftJoin('click.delivery', 'delivery')
      .where('delivery.campaignId = :campaignId', { campaignId })
      .groupBy('click.url')
      .select([
        'click.url as url',
        'COUNT(click.id) as clicks',
        'COUNT(DISTINCT click.deliveryId) as uniqueClicks',
      ])
      .getRawMany();

    const totalDelivered = await this.deliveryRepository.count({
      where: { campaignId, status: DeliveryStatus.DELIVERED },
    });

    return linkData.map(item => ({
      url: item.url,
      clicks: parseInt(item.clicks),
      uniqueClicks: parseInt(item.uniqueClicks),
      clickRate: totalDelivered > 0 ? (parseInt(item.uniqueClicks) / totalDelivered) * 100 : 0,
    }));
  }

  private async getTopPerformingCampaigns(
    startDate: Date, 
    endDate: Date, 
    limit: number
  ): Promise<Array<{
    id: string;
    name: string;
    openRate: number;
    clickRate: number;
    sent: number;
  }>> {
    const campaigns = await this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoin('campaign.deliveries', 'deliveries')
      .leftJoin('deliveries.opens', 'opens')
      .leftJoin('deliveries.clicks', 'clicks')
      .where('campaign.sentAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('campaign.id')
      .select([
        'campaign.id as id',
        'campaign.name as name',
        'COUNT(deliveries.id) as sent',
        'COUNT(CASE WHEN deliveries.status = :delivered THEN 1 END) as delivered',
        'COUNT(DISTINCT opens.deliveryId) as opened',
        'COUNT(DISTINCT clicks.deliveryId) as clicked',
      ])
      .setParameter('delivered', DeliveryStatus.DELIVERED)
      .orderBy('(COUNT(DISTINCT opens.deliveryId) / NULLIF(COUNT(CASE WHEN deliveries.status = :delivered THEN 1 END), 0))', 'DESC')
      .limit(limit)
      .getRawMany();

    return campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      sent: parseInt(campaign.sent),
      openRate: parseInt(campaign.delivered) > 0 
        ? (parseInt(campaign.opened) / parseInt(campaign.delivered)) * 100 
        : 0,
      clickRate: parseInt(campaign.delivered) > 0 
        ? (parseInt(campaign.clicked) / parseInt(campaign.delivered)) * 100 
        : 0,
    }));
  }

  private async getRecentActivity(limit: number): Promise<Array<{
    type: string;
    description: string;
    timestamp: Date;
    campaignId?: string;
    campaignName?: string;
  }>> {
    // Mock implementation - in production, you'd have an activity log table
    return [
      {
        type: 'campaign_sent',
        description: 'Campaign "Welcome Series #1" was sent to 1,500 recipients',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        campaignId: '1',
        campaignName: 'Welcome Series #1',
      },
      {
        type: 'automation_triggered',
        description: 'Automation "Abandoned Cart" was triggered 25 times',
        timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      },
      {
        type: 'campaign_created',
        description: 'New campaign "Product Launch" was created',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        campaignId: '2',
        campaignName: 'Product Launch',
      },
    ];
  }
}
