import { Injectable } from "@nestjs/common"
import { Repository } from "typeorm"
import { EventView } from "../entities/event-view.entity"
import { PurchaseLog } from "../entities/purchase-log.entity"
import { EventEngagement } from "../entities/event-engagement.entity"
import { TrackViewDto } from "../dto/track-view.dto"
import { TrackPurchaseDto } from "../dto/track-purchase.dto"
import { TrackEngagementDto } from "../dto/track-engagement.dto"

@Injectable()
export class AnalyticsTrackingService {
  constructor(
    private eventViewRepository: Repository<EventView>,
    private purchaseLogRepository: Repository<PurchaseLog>,
    private eventEngagementRepository: Repository<EventEngagement>,
  ) {}

  /**
   * Track event page view
   */
  async trackView(trackViewDto: TrackViewDto, ipAddress?: string): Promise<void> {
    const eventView = this.eventViewRepository.create({
      ...trackViewDto,
      ipAddress: ipAddress || trackViewDto.ipAddress,
      trafficSource: this.normalizeTrafficSource(trackViewDto.trafficSource, trackViewDto.referrerUrl),
    })

    await this.eventViewRepository.save(eventView)
  }

  /**
   * Track ticket purchase
   */
  async trackPurchase(trackPurchaseDto: TrackPurchaseDto, ipAddress?: string): Promise<void> {
    const purchaseLog = this.purchaseLogRepository.create({
      ...trackPurchaseDto,
      ipAddress: ipAddress || trackPurchaseDto.ipAddress,
      trafficSource: this.normalizeTrafficSource(trackPurchaseDto.trafficSource, trackPurchaseDto.referrerUrl),
      completedAt: trackPurchaseDto.status === "completed" ? new Date() : undefined,
    })

    await this.purchaseLogRepository.save(purchaseLog)

    // Update conversion flag for related views
    if (trackPurchaseDto.status === "completed") {
      await this.updateViewConversion(trackPurchaseDto.eventId, trackPurchaseDto.purchaserId, purchaseLog.id)
    }
  }

  /**
   * Track user engagement
   */
  async trackEngagement(trackEngagementDto: TrackEngagementDto, ipAddress?: string): Promise<void> {
    const engagement = this.eventEngagementRepository.create({
      ...trackEngagementDto,
      ipAddress,
      trafficSource: this.normalizeTrafficSource(trackEngagementDto.trafficSource),
    })

    await this.eventEngagementRepository.save(engagement)
  }

  /**
   * Update view conversion status
   */
  private async updateViewConversion(eventId: string, userId: string, purchaseId: string): Promise<void> {
    await this.eventViewRepository.update(
      {
        eventId,
        userId,
        convertedToPurchase: false,
      },
      {
        convertedToPurchase: true,
        purchaseId,
      },
    )
  }

  /**
   * Normalize traffic source based on referrer and UTM parameters
   */
  private normalizeTrafficSource(trafficSource?: string, referrerUrl?: string): string {
    if (trafficSource) {
      return trafficSource.toLowerCase()
    }

    if (!referrerUrl) {
      return "direct"
    }

    const referrer = referrerUrl.toLowerCase()

    // Social media sources
    if (referrer.includes("facebook.com") || referrer.includes("fb.com")) return "facebook"
    if (referrer.includes("twitter.com") || referrer.includes("t.co")) return "twitter"
    if (referrer.includes("linkedin.com")) return "linkedin"
    if (referrer.includes("instagram.com")) return "instagram"
    if (referrer.includes("youtube.com")) return "youtube"
    if (referrer.includes("tiktok.com")) return "tiktok"

    // Search engines
    if (referrer.includes("google.com")) return "google"
    if (referrer.includes("bing.com")) return "bing"
    if (referrer.includes("yahoo.com")) return "yahoo"
    if (referrer.includes("duckduckgo.com")) return "duckduckgo"

    // Email providers
    if (referrer.includes("gmail.com") || referrer.includes("outlook.com") || referrer.includes("yahoo.com")) {
      return "email"
    }

    // Default to referral
    return "referral"
  }

  /**
   * Parse user agent for device information
   */
  parseUserAgent(userAgent: string): {
    deviceType: string
    browser: string
    operatingSystem: string
  } {
    const ua = userAgent.toLowerCase()

    // Device type detection
    let deviceType = "desktop"
    if (ua.includes("mobile") || ua.includes("android")) deviceType = "mobile"
    else if (ua.includes("tablet") || ua.includes("ipad")) deviceType = "tablet"

    // Browser detection
    let browser = "unknown"
    if (ua.includes("chrome")) browser = "chrome"
    else if (ua.includes("firefox")) browser = "firefox"
    else if (ua.includes("safari")) browser = "safari"
    else if (ua.includes("edge")) browser = "edge"
    else if (ua.includes("opera")) browser = "opera"

    // OS detection
    let operatingSystem = "unknown"
    if (ua.includes("windows")) operatingSystem = "windows"
    else if (ua.includes("mac")) operatingSystem = "macos"
    else if (ua.includes("linux")) operatingSystem = "linux"
    else if (ua.includes("android")) operatingSystem = "android"
    else if (ua.includes("ios")) operatingSystem = "ios"

    return { deviceType, browser, operatingSystem }
  }

  /**
   * Get IP-based location (placeholder - integrate with IP geolocation service)
   */
  async getLocationFromIP(ipAddress: string): Promise<{ country: string; city: string }> {
    // Placeholder implementation
    // In production, integrate with services like MaxMind, IPStack, or similar
    return {
      country: "Unknown",
      city: "Unknown",
    }
  }
}
