import { Controller, Get, Post } from "@nestjs/common"
import { Request } from "express"
import { EventAnalyticsService } from "../services/event-analytics.service"
import { AnalyticsTrackingService } from "../services/analytics-tracking.service"
import { TrackViewDto } from "../dto/track-view.dto"
import { TrackPurchaseDto } from "../dto/track-purchase.dto"
import { TrackEngagementDto } from "../dto/track-engagement.dto"
import { AnalyticsFilterDto } from "../dto/analytics-response.dto"

@Controller("events")
export class EventAnalyticsController {
  private readonly eventAnalyticsService: EventAnalyticsService
  private readonly analyticsTrackingService: AnalyticsTrackingService

  constructor(eventAnalyticsService: EventAnalyticsService, analyticsTrackingService: AnalyticsTrackingService) {
    this.eventAnalyticsService = eventAnalyticsService
    this.analyticsTrackingService = analyticsTrackingService
  }

  @Get(":id/analytics")
  async getEventAnalytics(eventId: string, organizerId: string, filters: AnalyticsFilterDto) {
    return this.eventAnalyticsService.getEventAnalytics(eventId, organizerId, filters)
  }

  @Post(":id/track/view")
  async trackView(eventId: string, trackViewDto: TrackViewDto, req: Request) {
    const ipAddress = req.ip || req.connection.remoteAddress
    const userAgent = req.headers["user-agent"]

    // Parse user agent if not provided
    if (userAgent && !trackViewDto.deviceType) {
      const parsed = this.analyticsTrackingService.parseUserAgent(userAgent)
      trackViewDto.deviceType = parsed.deviceType
      trackViewDto.browser = parsed.browser
      trackViewDto.operatingSystem = parsed.operatingSystem
    }

    // Get location from IP if not provided
    if (ipAddress && !trackViewDto.country) {
      const location = await this.analyticsTrackingService.getLocationFromIP(ipAddress)
      trackViewDto.country = location.country
      trackViewDto.city = location.city
    }

    await this.analyticsTrackingService.trackView(
      {
        ...trackViewDto,
        eventId,
        userAgent,
      },
      ipAddress,
    )

    return { success: true, message: "View tracked successfully" }
  }

  @Post(":id/track/purchase")
  async trackPurchase(eventId: string, trackPurchaseDto: TrackPurchaseDto, req: Request) {
    const ipAddress = req.ip || req.connection.remoteAddress

    await this.analyticsTrackingService.trackPurchase(
      {
        ...trackPurchaseDto,
        eventId,
      },
      ipAddress,
    )

    return { success: true, message: "Purchase tracked successfully" }
  }

  @Post(":id/track/engagement")
  async trackEngagement(eventId: string, trackEngagementDto: TrackEngagementDto, req: Request) {
    const ipAddress = req.ip || req.connection.remoteAddress

    await this.analyticsTrackingService.trackEngagement(
      {
        ...trackEngagementDto,
        eventId,
      },
      ipAddress,
    )

    return { success: true, message: "Engagement tracked successfully" }
  }
}
