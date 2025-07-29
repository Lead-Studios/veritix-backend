import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import { NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common"
import { Repository } from "typeorm"
import { TicketingService } from "../services/ticketing.service"
import { QrCodeService } from "../services/qr-code.service"
import { Event } from "../entities/event.entity"
import { Ticket, TicketStatus } from "../entities/ticket.entity"
import { PurchaseTicketDto } from "../dto/purchase-ticket.dto"
import { ScanTicketDto } from "../dto/scan-ticket.dto"
import { jest } from "@jest/globals"

describe("TicketingService", () => {
  let service: TicketingService
  let eventRepository: Repository<Event>
  let ticketRepository: Repository<Ticket>
  let qrCodeService: QrCodeService

  const mockEventRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  }

  const mockTicketRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  }

  const mockQrCodeService = {
    generateQrCode: jest.fn(),
    verifyQrCode: jest.fn(),
    generateTicketNumber: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketingService,
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventRepository,
        },
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketRepository,
        },
        {
          provide: QrCodeService,
          useValue: mockQrCodeService,
        },
      ],
    }).compile()

    service = module.get<TicketingService>(TicketingService)
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event))
    ticketRepository = module.get<Repository<Ticket>>(getRepositoryToken(Ticket))
    qrCodeService = module.get<QrCodeService>(QrCodeService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("purchaseTickets", () => {
    const mockEvent: Event = {
      id: "event-1",
      name: "Test Event",
      description: "Test Description",
      startDate: new Date("2024-12-01"),
      endDate: new Date("2024-12-02"),
      location: "Test Location",
      organizerId: "organizer-1",
      ticketPrice: 100,
      maxCapacity: 100,
      isActive: true,
      tickets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const purchaseData: PurchaseTicketDto = {
      eventId: "event-1",
      purchaserId: "user-1",
      purchaserName: "John Doe",
      purchaserEmail: "john@example.com",
      quantity: 2,
    }

    it("should successfully purchase tickets", async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent)
      mockTicketRepository.count.mockResolvedValue(10) // 10 existing tickets
      mockQrCodeService.generateTicketNumber.mockReturnValue("TICKET-123")
      mockQrCodeService.generateQrCode.mockResolvedValue({
        qrCodeData: "qr-data",
        qrCodeImage: "qr-image",
        secureHash: "secure-hash",
      })

      const mockTicket = {
        id: "ticket-1",
        ticketNumber: "TICKET-123",
        eventId: "event-1",
        purchaserId: "user-1",
        purchaserName: "John Doe",
        purchaserEmail: "john@example.com",
        pricePaid: 100,
        purchaseDate: new Date(),
        status: TicketStatus.ACTIVE,
        qrCodeData: "qr-data",
        qrCodeImage: "qr-image",
        secureHash: "secure-hash",
      }

      mockTicketRepository.create.mockReturnValue(mockTicket)
      mockTicketRepository.save.mockResolvedValue(mockTicket)

      const result = await service.purchaseTickets(purchaseData)

      expect(result.success).toBe(true)
      expect(result.tickets).toHaveLength(2)
      expect(result.totalAmount).toBe(200)
      expect(mockTicketRepository.save).toHaveBeenCalledTimes(4) // 2 tickets, saved twice each
    })

    it("should throw NotFoundException for non-existent event", async () => {
      mockEventRepository.findOne.mockResolvedValue(null)

      await expect(service.purchaseTickets(purchaseData)).rejects.toThrow(NotFoundException)
    })

    it("should throw BadRequestException for past events", async () => {
      const pastEvent = { ...mockEvent, endDate: new Date("2020-01-01") }
      mockEventRepository.findOne.mockResolvedValue(pastEvent)

      await expect(service.purchaseTickets(purchaseData)).rejects.toThrow(BadRequestException)
    })

    it("should throw BadRequestException when exceeding capacity", async () => {
      mockEventRepository.findOne.mockResolvedValue(mockEvent)
      mockTicketRepository.count.mockResolvedValue(99) // 99 existing tickets, capacity is 100

      await expect(service.purchaseTickets(purchaseData)).rejects.toThrow(BadRequestException)
    })
  })

  describe("scanTicket", () => {
    const scanData: ScanTicketDto = {
      qrCodeData: "qr-data",
      scannedBy: "scanner-1",
      eventId: "event-1",
    }

    const mockTicket: Ticket = {
      id: "ticket-1",
      ticketNumber: "TICKET-123",
      eventId: "event-1",
      purchaserId: "user-1",
      purchaserName: "John Doe",
      purchaserEmail: "john@example.com",
      qrCodeData: "qr-data",
      qrCodeImage: "qr-image",
      secureHash: "secure-hash",
      status: TicketStatus.ACTIVE,
      usedAt: null,
      scannedBy: null,
      pricePaid: 100,
      purchaseDate: new Date(),
      event: {
        id: "event-1",
        name: "Test Event",
        endDate: new Date("2024-12-02"),
      } as Event,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it("should successfully scan and validate ticket", async () => {
      mockQrCodeService.verifyQrCode.mockReturnValue({
        isValid: true,
        payload: { ticketId: "ticket-1", eventId: "event-1" },
      })
      mockTicketRepository.findOne.mockResolvedValue(mockTicket)
      mockTicketRepository.save.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.USED,
        usedAt: new Date(),
        scannedBy: "scanner-1",
      })

      const result = await service.scanTicket(scanData)

      expect(result.success).toBe(true)
      expect(result.message).toBe("Ticket successfully validated")
      expect(result.ticket?.status).toBe(TicketStatus.USED)
      expect(mockTicketRepository.save).toHaveBeenCalled()
    })

    it("should reject invalid QR code", async () => {
      mockQrCodeService.verifyQrCode.mockReturnValue({
        isValid: false,
        error: "Invalid QR code",
      })

      const result = await service.scanTicket(scanData)

      expect(result.success).toBe(false)
      expect(result.message).toBe("Invalid QR code")
      expect(result.error).toBe("Invalid QR code")
    })

    it("should reject non-existent ticket", async () => {
      mockQrCodeService.verifyQrCode.mockReturnValue({
        isValid: true,
        payload: { ticketId: "ticket-1", eventId: "event-1" },
      })
      mockTicketRepository.findOne.mockResolvedValue(null)

      const result = await service.scanTicket(scanData)

      expect(result.success).toBe(false)
      expect(result.message).toBe("Ticket not found")
    })

    it("should reject already used ticket", async () => {
      const usedTicket = {
        ...mockTicket,
        status: TicketStatus.USED,
        usedAt: new Date("2024-01-01"),
      }

      mockQrCodeService.verifyQrCode.mockReturnValue({
        isValid: true,
        payload: { ticketId: "ticket-1", eventId: "event-1" },
      })
      mockTicketRepository.findOne.mockResolvedValue(usedTicket)

      const result = await service.scanTicket(scanData)

      expect(result.success).toBe(false)
      expect(result.message).toBe("Ticket has already been used")
      expect(result.ticket?.status).toBe(TicketStatus.USED)
    })

    it("should reject cancelled ticket", async () => {
      const cancelledTicket = {
        ...mockTicket,
        status: TicketStatus.CANCELLED,
      }

      mockQrCodeService.verifyQrCode.mockReturnValue({
        isValid: true,
        payload: { ticketId: "ticket-1", eventId: "event-1" },
      })
      mockTicketRepository.findOne.mockResolvedValue(cancelledTicket)

      const result = await service.scanTicket(scanData)

      expect(result.success).toBe(false)
      expect(result.message).toBe("Ticket has been cancelled")
    })

    it("should reject ticket for past event", async () => {
      const pastEventTicket = {
        ...mockTicket,
        event: {
          ...mockTicket.event,
          endDate: new Date("2020-01-01"),
        },
      }

      mockQrCodeService.verifyQrCode.mockReturnValue({
        isValid: true,
        payload: { ticketId: "ticket-1", eventId: "event-1" },
      })
      mockTicketRepository.findOne.mockResolvedValue(pastEventTicket)

      const result = await service.scanTicket(scanData)

      expect(result.success).toBe(false)
      expect(result.message).toBe("Event has ended")
    })

    it("should reject ticket with event ID mismatch", async () => {
      mockQrCodeService.verifyQrCode.mockReturnValue({
        isValid: true,
        payload: { ticketId: "ticket-1", eventId: "event-1" },
      })
      mockTicketRepository.findOne.mockResolvedValue({
        ...mockTicket,
        eventId: "different-event",
      })

      const result = await service.scanTicket({ ...scanData, eventId: "event-1" })

      expect(result.success).toBe(false)
      expect(result.message).toBe("Ticket is not valid for this event")
    })
  })

  describe("getTicket", () => {
    it("should return ticket details", async () => {
      const mockTicket = {
        id: "ticket-1",
        ticketNumber: "TICKET-123",
        eventId: "event-1",
        purchaserName: "John Doe",
        purchaserEmail: "john@example.com",
        qrCodeImage: "qr-image",
        status: TicketStatus.ACTIVE,
        pricePaid: 100,
        purchaseDate: new Date(),
        event: { name: "Test Event" },
      }

      mockTicketRepository.findOne.mockResolvedValue(mockTicket)

      const result = await service.getTicket("ticket-1")

      expect(result).toBeDefined()
      expect(result.id).toBe("ticket-1")
      expect(result.eventName).toBe("Test Event")
    })

    it("should throw NotFoundException for non-existent ticket", async () => {
      mockTicketRepository.findOne.mockResolvedValue(null)

      await expect(service.getTicket("non-existent")).rejects.toThrow(NotFoundException)
    })
  })

  describe("cancelTicket", () => {
    const mockTicket = {
      id: "ticket-1",
      purchaserId: "user-1",
      status: TicketStatus.ACTIVE,
      event: { organizerId: "organizer-1" },
    }

    it("should cancel ticket by purchaser", async () => {
      mockTicketRepository.findOne.mockResolvedValue(mockTicket)
      mockTicketRepository.save.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.CANCELLED,
      })

      const result = await service.cancelTicket("ticket-1", "user-1")

      expect(result.success).toBe(true)
      expect(result.message).toBe("Ticket successfully cancelled")
    })

    it("should cancel ticket by organizer", async () => {
      mockTicketRepository.findOne.mockResolvedValue(mockTicket)
      mockTicketRepository.save.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.CANCELLED,
      })

      const result = await service.cancelTicket("ticket-1", "organizer-1")

      expect(result.success).toBe(true)
    })

    it("should throw ForbiddenException for unauthorized user", async () => {
      mockTicketRepository.findOne.mockResolvedValue(mockTicket)

      await expect(service.cancelTicket("ticket-1", "unauthorized-user")).rejects.toThrow(ForbiddenException)
    })

    it("should throw BadRequestException for already used ticket", async () => {
      mockTicketRepository.findOne.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.USED,
      })

      await expect(service.cancelTicket("ticket-1", "user-1")).rejects.toThrow(BadRequestException)
    })
  })

  describe("getEventStats", () => {
    it("should return event statistics", async () => {
      const mockEvent = {
        id: "event-1",
        organizerId: "organizer-1",
        maxCapacity: 100,
      }

      const mockTickets = [
        { status: TicketStatus.ACTIVE, pricePaid: 100 },
        { status: TicketStatus.USED, pricePaid: 100 },
        { status: TicketStatus.CANCELLED, pricePaid: 100 },
      ]

      mockEventRepository.findOne.mockResolvedValue(mockEvent)
      mockTicketRepository.find.mockResolvedValue(mockTickets)

      const result = await service.getEventStats("event-1", "organizer-1")

      expect(result.totalTickets).toBe(3)
      expect(result.soldTickets).toBe(2) // Active + Used
      expect(result.usedTickets).toBe(1)
      expect(result.cancelledTickets).toBe(1)
      expect(result.revenue).toBe(200) // Active + Used tickets
      expect(result.availableCapacity).toBe(98) // 100 - 2 sold
    })

    it("should throw ForbiddenException for unauthorized organizer", async () => {
      mockEventRepository.findOne.mockResolvedValue(null)

      await expect(service.getEventStats("event-1", "wrong-organizer")).rejects.toThrow(ForbiddenException)
    })
  })
})
