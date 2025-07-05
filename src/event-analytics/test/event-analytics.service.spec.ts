import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import { ForbiddenException } from "@nestjs/common"
import type { Repository } from "typeorm"
import { EventAnalyticsService } from "../services/event-analytics.service"
import { EventView } from "../entities/event-view.entity"
import { PurchaseLog } from "../entities/purchase-log.entity"
import { EventEngagement } from "../entities/event-engagement.entity"
import { Event } from "../../ticketing/entities/event.entity"
import { Refund } from "../../refunds/entities/refund.entity"
import type { AnalyticsFilterDto } from "../dto/analytics-response.dto"
import { jest } from "@jest/globals"

describe("EventAnalyticsService", () => {
  let service: EventAnalyticsService
  let eventRepository: Repository<Event>
  let eventViewRepository: Repository<EventView>
  let purchaseLogRepository: Repository<PurchaseLog>
  let eventEngagementRepository: Repository<EventEngagement>
  let refundRepository: Repository<Refund>

  const mockEventRepository = {
    findOne: jest.fn(),
  }

  const mockEventViewRepository = {
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
    find: jest.fn(),
  }

  const mockPurchaseLogRepository = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
  }

  const mockEventEngagementRepository = {
    find: jest.fn(),
    count: jest.fn(),
  }

  const mockRefundRepository = {
    find: jest.fn(),
  }

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getRawMany: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventAnalyticsService,
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventRepository,
        },
        {
          provide: getRepositoryToken(EventView),
          useValue: mockEventViewRepository,
        },
        {
          provide: getRepositoryToken(PurchaseLog),
          useValue: mockPurchaseLogRepository,
        },
        {
          provide: getRepositoryToken(EventEngagement),
          useValue: mockEventEngagementRepository,
        },
        {
          provide: getRepositoryToken(Refund),
          useValue: mockRefundRepository,
        },
      ],
    }).compile()

    service = module.get<EventAnalyticsService>(EventAnalyticsService)
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event))
    eventViewRepository = module.get<Repository<EventView>>(getRepositoryToken(EventView))
    purchaseLogRepository = module.get<Repository<PurchaseLog>>(getRepositoryToken(PurchaseLog))
    eventEngagementRepository = module.get<Repository<EventEngagement>>(getRepositoryToken(EventEngagement))
    refundRepository = module.get<Repository<Refund>>(getRepositoryToken(Refund))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("getEventAnalytics", () => {
    const mockEvent = {
      id: "event-123",
      name: "Test Event",
      startDate: new Date("2024-06-15"),
      ticketPrice: 100,
      maxCapacity: 500,
      organizerId: "organizer-123",
    }

    const filters: AnalyticsFilterDto = {
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    }

    beforeEach(() => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent)
      mockPurchaseLogRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockEventViewRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockEventEngagementRepository.find.mockResolvedValue([])
      mockRefundRepository.find.mockResolvedValue([])
      mockEventViewRepository.count.mockResolvedValue(100)
      mockEventEngagementRepository.count.mockResolvedValue(10)

      // Mock query builder responses
      mockQueryBuilder.getMany.mockResolvedValue([])
      mockQueryBuilder.getRawMany.mockResolvedValue([])
    })

    it("should return comprehensive analytics for authorized organizer", async () => {
      const result = await service.getEventAnalytics("event-123", "organizer-123", filters)

      expect(result).toBeDefined()
      expect(result.eventId).toBe("event-123")
      expect(result.eventName).toBe("Test Event")
      expect(result.salesMetrics).toBeDefined()
      expect(result.trafficMetrics).toBeDefined()
      expect(result.engagementMetrics).toBeDefined()
      expect(result.campaignMetrics).toBeDefined()
      expect(result.demographicMetrics).toBeDefined()
      expect(result.timeAnalysis).toBeDefined()
      expect(result.funnelMetrics).toBeDefined()
    })

    it("should throw ForbiddenException for unauthorized organizer", async () => {
      mockEventRepository.findOne.mockResolvedValue(null)

      await expect(service.getEventAnalytics("event-123", "wrong-organizer", filters)).rejects.toThrow(
        ForbiddenException,
      )
    })

    it("should apply traffic source filter", async () => {
      const filtersWithSource = { ...filters, trafficSource: "google" }

      await service.getEventAnalytics("event-123", "organizer-123", filtersWithSource)

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("purchase.trafficSource = :trafficSource", {
        trafficSource: "google",
      })
    })

    it("should exclude refunded purchases by default", async () => {
      await service.getEventAnalytics("event-123", "organizer-123", filters)

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("purchase.status != :refundedStatus", {
        refundedStatus: "refunded",
      })
    })

    it("should include refunded purchases when specified", async () => {
      const filtersWithRefunded = { ...filters, includeRefunded: true }

      await service.getEventAnalytics("event-123", "organizer-123", filtersWithRefunded)

      // Should not add the refunded status filter
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith("purchase.status != :refundedStatus", {
        refundedStatus: "refunded",
      })
    })
  })

  describe("getSalesMetrics", () => {
    it("should calculate sales metrics correctly", async () => {
      const mockPurchases = [
        {
          quantity: 2,
          totalAmount: 200,
          discountAmount: 20,
          status: "completed",
        },
        {
          quantity: 1,
          totalAmount: 100,
          discountAmount: 0,
          status: "completed",
        },
        {
          quantity: 1,
          totalAmount: 100,
          discountAmount: 0,
          status: "failed",
        },
      ]

      const mockRefunds = [
        {
          refundAmount: 50,
          status: "processed",
        },
      ]

      mockQueryBuilder.getMany.mockResolvedValue(mockPurchases)
      mockRefundRepository.find.mockResolvedValue(mockRefunds)
      mockEventViewRepository.count.mockResolvedValue(1000)

      const result = await service["getSalesMetrics"](
        "event-123",
        { start: new Date("2024-01-01"), end: new Date("2024-12-31") },
        {},
      )

      expect(result.totalTicketsSold).toBe(3) // 2 + 1 from completed purchases
      expect(result.grossRevenue).toBe(300) // 200 + 100 from completed purchases
      expect(result.netRevenue).toBe(250) // 300 - 50 refund
      expect(result.discountAmount).toBe(20) // 20 + 0 from completed purchases
      expect(result.averageOrderValue).toBe(150) // 300 / 2 completed purchases
      expect(result.conversionRate).toBe(0.2) // 2 completed purchases / 1000 views * 100
    })
  })

  describe("getTrafficMetrics", () => {
    it("should calculate traffic metrics correctly", async () => {
      const mockViews = [
        {
          userId: "user-1",
          ipAddress: "192.168.1.1",
          timeOnPage: 120,
        },
        {
          userId: "user-2",
          ipAddress: "192.168.1.2",
          timeOnPage: 60,
        },
        {
          userId: "user-1", // Same user, different session
          ipAddress: "192.168.1.1",
          timeOnPage: 20, // Bounce
        },
      ]

      mockQueryBuilder.getMany.mockResolvedValue(mockViews)

      const result = await service["getTrafficMetrics"](
        "event-123",
        { start: new Date("2024-01-01"), end: new Date("2024-12-31") },
        {},
      )

      expect(result.totalViews).toBe(3)
      expect(result.uniqueVisitors).toBe(2) // user-1 and user-2
      expect(result.averageTimeOnPage).toBe(66.67) // (120 + 60 + 20) / 3
      expect(result.bounceRate).toBe(33.33) // 1 bounce out of 3 views * 100
    })
  })

  describe("getEngagementMetrics", () => {
    it("should calculate engagement metrics correctly", async () => {
      const mockEngagements = [
        { engagementType: "share" },
        { engagementType: "favorite" },
        { engagementType: "share" },
        { engagementType: "newsletter_signup" },
        { engagementType: "calendar_add" },
      ]

      mockEventEngagementRepository.find.mockResolvedValue(mockEngagements)
      mockEventViewRepository.count.mockResolvedValue(100)

      const result = await service["getEngagementMetrics"](
        "event-123",
        { start: new Date("2024-01-01"), end: new Date("2024-12-31") },
        {},
      )

      expect(result.totalEngagements).toBe(5)
      expect(result.engagementRate).toBe(5) // 5 engagements / 100 views * 100
      expect(result.socialShares).toBe(2)
      expect(result.favorites).toBe(1)
      expect(result.newsletterSignups).toBe(1)
      expect(result.calendarAdds).toBe(1)
    })
  })

  describe("date range handling", () => {
    it("should use provided date range", () => {
      const filters: AnalyticsFilterDto = {
        startDate: "2024-06-01",
        endDate: "2024-06-30",
      }

      const result = service["getDateRange"](filters)

      expect(result.start).toEqual(new Date("2024-06-01"))
      expect(result.end).toEqual(new Date("2024-06-30"))
    })

    it("should default to last 30 days when no dates provided", () => {
      const filters: AnalyticsFilterDto = {}
      const result = service["getDateRange"](filters)

      expect(result.end).toBeInstanceOf(Date)
      expect(result.start).toBeInstanceOf(Date)
      expect(result.end.getTime() - result.start.getTime()).toBeCloseTo(30 * 24 * 60 * 60 * 1000, -1000) // ~30 days
    })

    it("should use current date as end when only start date provided", () => {
      const filters: AnalyticsFilterDto = {
        startDate: "2024-06-01",
      }

      const result = service["getDateRange"](filters)

      expect(result.start).toEqual(new Date("2024-06-01"))
      expect(result.end).toBeInstanceOf(Date)
    })
  })
})
