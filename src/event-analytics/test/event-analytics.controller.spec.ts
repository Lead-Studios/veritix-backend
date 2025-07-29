import { Test, type TestingModule } from "@nestjs/testing"
import { Request } from "express"
import { EventAnalyticsController } from "../controllers/event-analytics.controller"
import { EventAnalyticsService } from "../services/event-analytics.service"
import { AnalyticsTrackingService } from "../services/analytics-tracking.service"
import { EngagementType } from "../entities/event-engagement.entity"
import { TrackViewDto } from "../dto/track-view.dto"
import { TrackPurchaseDto } from "../dto/track-purchase.dto"
import { TrackEngagementDto } from "../dto/track-engagement.dto"
import { AnalyticsFilterDto } from "../dto/analytics-response.dto"
import { jest } from "@jest/globals"

describe("EventAnalyticsController", () => {
  let controller: EventAnalyticsController
  let eventAnalyticsService: EventAnalyticsService
  let analyticsTrackingService: AnalyticsTrackingService

  const mockEventAnalyticsService = {
    getEventAnalytics: jest.fn(),
  }

  const mockAnalyticsTrackingService = {
    trackView: jest.fn(),
    trackPurchase: jest.fn(),
    trackEngagement: jest.fn(),
    parseUserAgent: jest.fn(),
    getLocationFromIP: jest.fn(),
  }

  const mockRequest = {
    ip: "192.168.1.1",
    connection: { remoteAddress: "192.168.1.1" },
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  } as unknown as Request

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventAnalyticsController],
      providers: [
        {
          provide: EventAnalyticsService,
          useValue: mockEventAnalyticsService,
        },
        {
          provide: AnalyticsTrackingService,
          useValue: mockAnalyticsTrackingService,
        },
      ],
    }).compile()

    controller = module.get<EventAnalyticsController>(EventAnalyticsController)
    eventAnalyticsService = module.get<EventAnalyticsService>(EventAnalyticsService)
    analyticsTrackingService = module.get<AnalyticsTrackingService>(AnalyticsTrackingService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should be defined", () => {
    expect(controller).toBeDefined()
  })

  describe("getEventAnalytics", () => {
    it("should return event analytics", async () => {
      const eventId = "event-123"
      const organizerId = "organizer-456"
      const filters: AnalyticsFilterDto = {
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        trafficSource: "google",
      }

      const mockAnalytics = {
        eventId,
        eventName: "Test Event",
        salesMetrics: {
          totalTicketsSold: 100,
          totalRevenue: 10000,
        },
        trafficMetrics: {
          totalViews: 1000,
          uniqueVisitors: 800,
        },
      }

      mockEventAnalyticsService.getEventAnalytics.mockResolvedValue(mockAnalytics)

      const result = await controller.getEventAnalytics(eventId, organizerId, filters)

      expect(result).toEqual(mockAnalytics)
      expect(mockEventAnalyticsService.getEventAnalytics).toHaveBeenCalledWith(eventId, organizerId, filters)
    })
  })

  describe("trackView", () => {
    it("should track view with parsed user agent", async () => {
      const eventId = "event-123"
      const trackViewDto: TrackViewDto = {
        eventId,
        userId: "user-456",
        trafficSource: "google",
        timeOnPage: 180,
      }

      mockAnalyticsTrackingService.parseUserAgent.mockReturnValue({
        deviceType: "desktop",
        browser: "chrome",
        operatingSystem: "windows",
      })

      mockAnalyticsTrackingService.getLocationFromIP.mockResolvedValue({
        country: "United States",
        city: "San Francisco",
      })

      const result = await controller.trackView(eventId, trackViewDto, mockRequest)

      expect(result).toEqual({
        success: true,
        message: "View tracked successfully",
      })

      expect(mockAnalyticsTrackingService.parseUserAgent).toHaveBeenCalledWith(mockRequest.headers["user-agent"])
      expect(mockAnalyticsTrackingService.getLocationFromIP).toHaveBeenCalledWith("192.168.1.1")
      expect(mockAnalyticsTrackingService.trackView).toHaveBeenCalledWith(
        {
          ...trackViewDto,
          eventId,
          userAgent: mockRequest.headers["user-agent"],
          deviceType: "desktop",
          browser: "chrome",
          operatingSystem: "windows",
          country: "United States",
          city: "San Francisco",
        },
        "192.168.1.1",
      )
    })

    it("should track view without parsing when device info provided", async () => {
      const eventId = "event-123"
      const trackViewDto: TrackViewDto = {
        eventId,
        userId: "user-456",
        deviceType: "mobile",
        browser: "safari",
        operatingSystem: "ios",
        country: "Canada",
        city: "Toronto",
      }

      const result = await controller.trackView(eventId, trackViewDto, mockRequest)

      expect(result.success).toBe(true)
      expect(mockAnalyticsTrackingService.parseUserAgent).not.toHaveBeenCalled()
      expect(mockAnalyticsTrackingService.getLocationFromIP).not.toHaveBeenCalled()
      expect(mockAnalyticsTrackingService.trackView).toHaveBeenCalledWith(
        {
          ...trackViewDto,
          eventId,
          userAgent: mockRequest.headers["user-agent"],
        },
        "192.168.1.1",
      )
    })
  })

  describe("trackPurchase", () => {
    it("should track purchase successfully", async () => {
      const eventId = "event-123"
      const trackPurchaseDto: TrackPurchaseDto = {
        eventId,
        purchaserId: "user-456",
        purchaserName: "John Doe",
        purchaserEmail: "john@example.com",
        quantity: 2,
        unitPrice: 100,
        totalAmount: 200,
        status: "completed",
        paymentMethod: "credit_card",
        transactionId: "txn-123",
      }

      const result = await controller.trackPurchase(eventId, trackPurchaseDto, mockRequest)

      expect(result).toEqual({
        success: true,
        message: "Purchase tracked successfully",
      })

      expect(mockAnalyticsTrackingService.trackPurchase).toHaveBeenCalledWith(
        {
          ...trackPurchaseDto,
          eventId,
        },
        "192.168.1.1",
      )
    })
  })

  describe("trackEngagement", () => {
    it("should track engagement successfully", async () => {
      const eventId = "event-123"
      const trackEngagementDto: TrackEngagementDto = {
        eventId,
        userId: "user-456",
        engagementType: EngagementType.SHARE,
        metadata: {
          platform: "twitter",
          url: "https://twitter.com/share",
        },
        trafficSource: "social",
      }

      const result = await controller.trackEngagement(eventId, trackEngagementDto, mockRequest)

      expect(result).toEqual({
        success: true,
        message: "Engagement tracked successfully",
      })

      expect(mockAnalyticsTrackingService.trackEngagement).toHaveBeenCalledWith(
        {
          ...trackEngagementDto,
          eventId,
        },
        "192.168.1.1",
      )
    })
  })

  describe("IP address handling", () => {
    it("should use req.ip when available", async () => {
      const eventId = "event-123"
      const trackViewDto: TrackViewDto = { eventId }

      await controller.trackView(eventId, trackViewDto, mockRequest)

      expect(mockAnalyticsTrackingService.trackView).toHaveBeenCalledWith(
        expect.objectContaining({ eventId }),
        "192.168.1.1",
      )
    })

    it("should fallback to connection.remoteAddress", async () => {
      const eventId = "event-123"
      const trackViewDto: TrackViewDto = { eventId }
      const requestWithoutIP = {
        ip: undefined,
        connection: { remoteAddress: "10.0.0.1" },
        headers: {},
      } as unknown as Request

      await controller.trackView(eventId, trackViewDto, requestWithoutIP)

      expect(mockAnalyticsTrackingService.trackView).toHaveBeenCalledWith(
        expect.objectContaining({ eventId }),
        "10.0.0.1",
      )
    })
  })
})
