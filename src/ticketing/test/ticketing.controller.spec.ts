import { Test, type TestingModule } from "@nestjs/testing"
import { TicketingController } from "../controllers/ticketing.controller"
import { TicketingService } from "../services/ticketing.service"
import type { PurchaseTicketDto } from "../dto/purchase-ticket.dto"
import type { ScanTicketDto } from "../dto/scan-ticket.dto"
import { TicketStatus } from "../entities/ticket.entity"
import { jest } from "@jest/globals"

describe("TicketingController", () => {
  let controller: TicketingController
  let ticketingService: TicketingService

  const mockTicketingService = {
    purchaseTickets: jest.fn(),
    scanTicket: jest.fn(),
    getTicket: jest.fn(),
    getTicketsByPurchaser: jest.fn(),
    getTicketsByEvent: jest.fn(),
    getEventStats: jest.fn(),
    cancelTicket: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketingController],
      providers: [
        {
          provide: TicketingService,
          useValue: mockTicketingService,
        },
      ],
    }).compile()

    controller = module.get<TicketingController>(TicketingController)
    ticketingService = module.get<TicketingService>(TicketingService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should be defined", () => {
    expect(controller).toBeDefined()
  })

  describe("purchaseTickets", () => {
    it("should purchase tickets successfully", async () => {
      const purchaseData: PurchaseTicketDto = {
        eventId: "event-1",
        purchaserId: "user-1",
        purchaserName: "John Doe",
        purchaserEmail: "john@example.com",
        quantity: 2,
      }

      const mockResponse = {
        success: true,
        message: "Successfully purchased 2 ticket(s)",
        tickets: [],
        totalAmount: 200,
      }

      mockTicketingService.purchaseTickets.mockResolvedValue(mockResponse)

      const result = await controller.purchaseTickets(purchaseData)

      expect(result).toEqual(mockResponse)
      expect(mockTicketingService.purchaseTickets).toHaveBeenCalledWith(purchaseData)
    })
  })

  describe("scanTicket", () => {
    it("should scan ticket successfully", async () => {
      const scanData: ScanTicketDto = {
        qrCodeData: "qr-data",
        scannedBy: "scanner-1",
        eventId: "event-1",
      }

      const mockResponse = {
        success: true,
        message: "Ticket successfully validated",
        ticket: {
          id: "ticket-1",
          ticketNumber: "TICKET-123",
          eventName: "Test Event",
          purchaserName: "John Doe",
          status: TicketStatus.USED,
          usedAt: new Date(),
        },
      }

      mockTicketingService.scanTicket.mockResolvedValue(mockResponse)

      const result = await controller.scanTicket(scanData)

      expect(result).toEqual(mockResponse)
      expect(mockTicketingService.scanTicket).toHaveBeenCalledWith(scanData)
    })
  })

  describe("getTicket", () => {
    it("should get ticket details", async () => {
      const ticketId = "ticket-1"
      const mockTicket = {
        id: ticketId,
        ticketNumber: "TICKET-123",
        eventId: "event-1",
        eventName: "Test Event",
        purchaserName: "John Doe",
        purchaserEmail: "john@example.com",
        qrCodeImage: "qr-image",
        status: TicketStatus.ACTIVE,
        pricePaid: 100,
        purchaseDate: new Date(),
      }

      mockTicketingService.getTicket.mockResolvedValue(mockTicket)

      const result = await controller.getTicket(ticketId)

      expect(result).toEqual(mockTicket)
      expect(mockTicketingService.getTicket).toHaveBeenCalledWith(ticketId)
    })
  })

  describe("getTicketsByPurchaser", () => {
    it("should get tickets by purchaser", async () => {
      const purchaserId = "user-1"
      const mockTickets = [
        {
          id: "ticket-1",
          ticketNumber: "TICKET-123",
          eventName: "Test Event",
          status: TicketStatus.ACTIVE,
        },
      ]

      mockTicketingService.getTicketsByPurchaser.mockResolvedValue(mockTickets)

      const result = await controller.getTicketsByPurchaser(purchaserId)

      expect(result).toEqual(mockTickets)
      expect(mockTicketingService.getTicketsByPurchaser).toHaveBeenCalledWith(purchaserId)
    })
  })

  describe("getTicketsByEvent", () => {
    it("should get tickets by event", async () => {
      const eventId = "event-1"
      const organizerId = "organizer-1"
      const mockTickets = [
        {
          id: "ticket-1",
          ticketNumber: "TICKET-123",
          eventName: "Test Event",
          status: TicketStatus.ACTIVE,
        },
      ]

      mockTicketingService.getTicketsByEvent.mockResolvedValue(mockTickets)

      const result = await controller.getTicketsByEvent(eventId, organizerId)

      expect(result).toEqual(mockTickets)
      expect(mockTicketingService.getTicketsByEvent).toHaveBeenCalledWith(eventId, organizerId)
    })
  })

  describe("getEventStats", () => {
    it("should get event statistics", async () => {
      const eventId = "event-1"
      const organizerId = "organizer-1"
      const mockStats = {
        totalTickets: 10,
        soldTickets: 8,
        usedTickets: 5,
        cancelledTickets: 2,
        revenue: 800,
        availableCapacity: 92,
      }

      mockTicketingService.getEventStats.mockResolvedValue(mockStats)

      const result = await controller.getEventStats(eventId, organizerId)

      expect(result).toEqual(mockStats)
      expect(mockTicketingService.getEventStats).toHaveBeenCalledWith(eventId, organizerId)
    })
  })

  describe("cancelTicket", () => {
    it("should cancel ticket successfully", async () => {
      const ticketId = "ticket-1"
      const requesterId = "user-1"
      const mockResponse = {
        success: true,
        message: "Ticket successfully cancelled",
      }

      mockTicketingService.cancelTicket.mockResolvedValue(mockResponse)

      const result = await controller.cancelTicket(ticketId, requesterId)

      expect(result).toEqual(mockResponse)
      expect(mockTicketingService.cancelTicket).toHaveBeenCalledWith(ticketId, requesterId)
    })
  })
})
