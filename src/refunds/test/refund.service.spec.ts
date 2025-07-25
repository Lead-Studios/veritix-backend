import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import { NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common"
import { Repository } from "typeorm"
import { RefundService } from "../services/refund.service"
import { Refund, RefundStatus, RefundReason } from "../entities/refund.entity"
import { Ticket, TicketStatus } from "../../ticketing/entities/ticket.entity"
import { TicketingEvent } from "../../ticketing/entities/event.entity"
import { CreateRefundDto } from "../dto/create-refund.dto"
import { jest } from "@jest/globals"

describe("RefundService", () => {
  let service: RefundService
  let refundRepository: Repository<Refund>
  let ticketRepository: Repository<Ticket>
  let eventRepository: Repository<Event>

  const mockRefundRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  }

  const mockTicketRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  }

  const mockEventRepository = {
    findOne: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        {
          provide: getRepositoryToken(Refund),
          useValue: mockRefundRepository,
        },
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketRepository,
        },
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventRepository,
        },
      ],
    }).compile()

    service = module.get<RefundService>(RefundService)
    refundRepository = module.get<Repository<Refund>>(getRepositoryToken(Refund))
    ticketRepository = module.get<Repository<Ticket>>(getRepositoryToken(Ticket))
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  describe("createRefund", () => {
    const mockTicket: Ticket = {
      id: "ticket-1",
      ticketNumber: "TICKET-123",
      eventId: "event-1",
      purchaserId: "user-1",
      purchaserName: "John Doe",
      purchaserEmail: "john@example.com",
      pricePaid: 100,
      status: TicketStatus.ACTIVE,
      event: {
        id: "event-1",
        name: "Test Event",
        organizerId: "organizer-1",
      } as Event,
    } as Ticket

    const createRefundDto: CreateRefundDto = {
      ticketId: "ticket-1",
      processedBy: "organizer-1",
      reason: RefundReason.CUSTOMER_REQUEST,
      reasonDescription: "Customer request",
    }

    it("should create a full refund successfully", async () => {
      mockTicketRepository.findOne.mockResolvedValue(mockTicket)
      mockRefundRepository.findOne.mockResolvedValue(null) // No existing refund
      mockRefundRepository.create.mockReturnValue({
        id: "refund-1",
        ticketId: "ticket-1",
        refundAmount: 100,
        refundPercentage: 100,
        isPartialRefund: false,
      })
      mockRefundRepository.save.mockResolvedValue({
        id: "refund-1",
        ticketId: "ticket-1",
        refundAmount: 100,
        refundPercentage: 100,
        isPartialRefund: false,
        status: RefundStatus.PENDING,
      })

      const result = await service.createRefund(createRefundDto)

      expect(result).toBeDefined()
      expect(result.refundAmount).toBe(100)
      expect(result.refundPercentage).toBe(100)
      expect(result.isPartialRefund).toBe(false)
      expect(mockRefundRepository.create).toHaveBeenCalled()
      expect(mockRefundRepository.save).toHaveBeenCalled()
    })

    it("should create a partial refund with percentage", async () => {
      const partialRefundDto = {
        ...createRefundDto,
        refundPercentage: 50,
      }

      mockTicketRepository.findOne.mockResolvedValue(mockTicket)
      mockRefundRepository.findOne.mockResolvedValue(null)
      mockRefundRepository.create.mockReturnValue({
        id: "refund-1",
        refundAmount: 50,
        refundPercentage: 50,
        isPartialRefund: true,
      })
      mockRefundRepository.save.mockResolvedValue({
        id: "refund-1",
        refundAmount: 50,
        refundPercentage: 50,
        isPartialRefund: true,
      })

      const result = await service.createRefund(partialRefundDto)

      expect(result.refundAmount).toBe(50)
      expect(result.refundPercentage).toBe(50)
      expect(result.isPartialRefund).toBe(true)
    })

    it("should create a partial refund with specific amount", async () => {
      const partialRefundDto = {
        ...createRefundDto,
        refundAmount: 75,
      }

      mockTicketRepository.findOne.mockResolvedValue(mockTicket)
      mockRefundRepository.findOne.mockResolvedValue(null)
      mockRefundRepository.create.mockReturnValue({
        id: "refund-1",
        refundAmount: 75,
        refundPercentage: 75,
        isPartialRefund: true,
      })
      mockRefundRepository.save.mockResolvedValue({
        id: "refund-1",
        refundAmount: 75,
        refundPercentage: 75,
        isPartialRefund: true,
      })

      const result = await service.createRefund(partialRefundDto)

      expect(result.refundAmount).toBe(75)
      expect(result.refundPercentage).toBe(75)
      expect(result.isPartialRefund).toBe(true)
    })

    it("should throw NotFoundException for non-existent ticket", async () => {
      mockTicketRepository.findOne.mockResolvedValue(null)

      await expect(service.createRefund(createRefundDto)).rejects.toThrow(NotFoundException)
    })

    it("should throw BadRequestException for cancelled ticket", async () => {
      const cancelledTicket = { ...mockTicket, status: TicketStatus.CANCELLED }
      mockTicketRepository.findOne.mockResolvedValue(cancelledTicket)

      await expect(service.createRefund(createRefundDto)).rejects.toThrow(BadRequestException)
    })

    it("should throw BadRequestException if refund already exists", async () => {
      mockTicketRepository.findOne.mockResolvedValue(mockTicket)
      mockRefundRepository.findOne.mockResolvedValue({ id: "existing-refund" })

      await expect(service.createRefund(createRefundDto)).rejects.toThrow(BadRequestException)
    })

    it("should throw BadRequestException for refund amount exceeding ticket price", async () => {
      const invalidRefundDto = {
        ...createRefundDto,
        refundAmount: 150, // More than ticket price of 100
      }

      mockTicketRepository.findOne.mockResolvedValue(mockTicket)
      mockRefundRepository.findOne.mockResolvedValue(null)

      await expect(service.createRefund(invalidRefundDto)).rejects.toThrow(BadRequestException)
    })

    it("should auto-process refund when autoProcess is true", async () => {
      const autoProcessDto = {
        ...createRefundDto,
        autoProcess: true,
      }

      mockTicketRepository.findOne.mockResolvedValue(mockTicket)
      mockRefundRepository.findOne.mockResolvedValue(null)
      mockRefundRepository.create.mockReturnValue({
        id: "refund-1",
        status: RefundStatus.APPROVED,
        processedAt: new Date(),
      })
      mockRefundRepository.save.mockResolvedValue({
        id: "refund-1",
        status: RefundStatus.APPROVED,
        processedAt: new Date(),
      })
      mockTicketRepository.save.mockResolvedValue(mockTicket)

      const result = await service.createRefund(autoProcessDto)

      expect(result.status).toBe(RefundStatus.APPROVED)
      expect(mockTicketRepository.save).toHaveBeenCalled()
    })
  })

  describe("processRefund", () => {
    const mockRefund = {
      id: "refund-1",
      status: RefundStatus.PENDING,
      ticket: {
        id: "ticket-1",
        status: TicketStatus.ACTIVE,
      },
      refundPercentage: 100,
    }

    it("should process a pending refund", async () => {
      mockRefundRepository.findOne.mockResolvedValue(mockRefund)
      mockRefundRepository.save.mockResolvedValue({
        ...mockRefund,
        status: RefundStatus.PROCESSED,
        processedAt: new Date(),
      })
      mockTicketRepository.save.mockResolvedValue(mockRefund.ticket)

      const result = await service.processRefund("refund-1", {
        status: RefundStatus.PROCESSED,
        refundTransactionId: "txn-123",
      })

      expect(result.status).toBe(RefundStatus.PROCESSED)
      expect(mockRefundRepository.save).toHaveBeenCalled()
      expect(mockTicketRepository.save).toHaveBeenCalled()
    })

    it("should throw NotFoundException for non-existent refund", async () => {
      mockRefundRepository.findOne.mockResolvedValue(null)

      await expect(
        service.processRefund("non-existent", {
          status: RefundStatus.PROCESSED,
        }),
      ).rejects.toThrow(NotFoundException)
    })

    it("should throw BadRequestException for already processed refund", async () => {
      const processedRefund = {
        ...mockRefund,
        status: RefundStatus.PROCESSED,
      }
      mockRefundRepository.findOne.mockResolvedValue(processedRefund)

      await expect(
        service.processRefund("refund-1", {
          status: RefundStatus.PROCESSED,
        }),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe("getRefundsByEvent", () => {
    it("should return refunds for authorized organizer", async () => {
      const mockEvent = {
        id: "event-1",
        organizerId: "organizer-1",
      }
      const mockRefunds = [
        {
          id: "refund-1",
          eventId: "event-1",
          ticket: { ticketNumber: "TICKET-123", event: { name: "Test Event" } },
        },
      ]

      mockEventRepository.findOne.mockResolvedValue(mockEvent)
      mockRefundRepository.find.mockResolvedValue(mockRefunds)

      const result = await service.getRefundsByEvent("event-1", "organizer-1")

      expect(result).toHaveLength(1)
      expect(mockEventRepository.findOne).toHaveBeenCalledWith({
        where: { id: "event-1", organizerId: "organizer-1" },
      })
    })

    it("should throw ForbiddenException for unauthorized organizer", async () => {
      mockEventRepository.findOne.mockResolvedValue(null)

      await expect(service.getRefundsByEvent("event-1", "wrong-organizer")).rejects.toThrow(ForbiddenException)
    })
  })

  describe("processBulkRefunds", () => {
    it("should process multiple refunds successfully", async () => {
      const bulkRefundDto = {
        ticketIds: ["ticket-1", "ticket-2"],
        processedBy: "organizer-1",
        refundPercentage: 100,
        reason: RefundReason.EVENT_CANCELLED,
        autoProcess: true,
      }

      const mockTicket1 = {
        id: "ticket-1",
        pricePaid: 100,
        status: TicketStatus.ACTIVE,
        event: { organizerId: "organizer-1", name: "Test Event" },
      }
      const mockTicket2 = {
        id: "ticket-2",
        pricePaid: 150,
        status: TicketStatus.ACTIVE,
        event: { organizerId: "organizer-1", name: "Test Event" },
      }

      // Mock successful refund creation for both tickets
      mockTicketRepository.findOne.mockResolvedValueOnce(mockTicket1).mockResolvedValueOnce(mockTicket2)
      mockRefundRepository.findOne.mockResolvedValue(null) // No existing refunds
      mockRefundRepository.create
        .mockReturnValueOnce({ id: "refund-1", refundAmount: 100 })
        .mockReturnValueOnce({ id: "refund-2", refundAmount: 150 })
      mockRefundRepository.save
        .mockResolvedValueOnce({ id: "refund-1", refundAmount: 100 })
        .mockResolvedValueOnce({ id: "refund-2", refundAmount: 150 })

      const result = await service.processBulkRefunds(bulkRefundDto)

      expect(result.success).toBe(true)
      expect(result.processedRefunds).toHaveLength(2)
      expect(result.failedRefunds).toHaveLength(0)
      expect(result.totalAmount).toBe(250)
    })

    it("should handle partial failures in bulk processing", async () => {
      const bulkRefundDto = {
        ticketIds: ["ticket-1", "non-existent-ticket"],
        processedBy: "organizer-1",
        refundPercentage: 100,
        reason: RefundReason.EVENT_CANCELLED,
      }

      const mockTicket1 = {
        id: "ticket-1",
        pricePaid: 100,
        status: TicketStatus.ACTIVE,
        event: { organizerId: "organizer-1", name: "Test Event" },
      }

      // First ticket succeeds, second fails
      mockTicketRepository.findOne.mockResolvedValueOnce(mockTicket1).mockResolvedValueOnce(null)
      mockRefundRepository.findOne.mockResolvedValue(null)
      mockRefundRepository.create.mockReturnValue({ id: "refund-1", refundAmount: 100 })
      mockRefundRepository.save.mockResolvedValue({ id: "refund-1", refundAmount: 100 })

      const result = await service.processBulkRefunds(bulkRefundDto)

      expect(result.success).toBe(false)
      expect(result.processedRefunds).toHaveLength(1)
      expect(result.failedRefunds).toHaveLength(1)
      expect(result.failedRefunds[0].ticketId).toBe("non-existent-ticket")
    })
  })

  describe("getRefundStats", () => {
    it("should return comprehensive refund statistics", async () => {
      const mockEvent = {
        id: "event-1",
        organizerId: "organizer-1",
      }

      const mockRefunds = [
        {
          refundAmount: 100,
          status: RefundStatus.PROCESSED,
          reason: RefundReason.CUSTOMER_REQUEST,
        },
        {
          refundAmount: 150,
          status: RefundStatus.PENDING,
          reason: RefundReason.EVENT_CANCELLED,
        },
        {
          refundAmount: 75,
          status: RefundStatus.REJECTED,
          reason: RefundReason.CUSTOMER_REQUEST,
        },
      ]

      mockEventRepository.findOne.mockResolvedValue(mockEvent)
      mockRefundRepository.find.mockResolvedValue(mockRefunds)

      const result = await service.getRefundStats("event-1", "organizer-1")

      expect(result.totalRefunds).toBe(3)
      expect(result.totalRefundAmount).toBe(325)
      expect(result.pendingRefunds).toBe(1)
      expect(result.processedRefunds).toBe(1)
      expect(result.rejectedRefunds).toBe(1)
      expect(result.averageRefundAmount).toBeCloseTo(108.33, 2)
      expect(result.refundsByReason[RefundReason.CUSTOMER_REQUEST]).toBe(2)
      expect(result.refundsByStatus[RefundStatus.PROCESSED]).toBe(1)
    })
  })

  describe("cancelRefund", () => {
    it("should cancel a pending refund by purchaser", async () => {
      const mockRefund = {
        id: "refund-1",
        status: RefundStatus.PENDING,
        purchaserId: "user-1",
        ticket: { event: { organizerId: "organizer-1" } },
      }

      mockRefundRepository.findOne.mockResolvedValue(mockRefund)
      mockRefundRepository.remove.mockResolvedValue(mockRefund)

      const result = await service.cancelRefund("refund-1", "user-1")

      expect(result.success).toBe(true)
      expect(mockRefundRepository.remove).toHaveBeenCalledWith(mockRefund)
    })

    it("should cancel a pending refund by organizer", async () => {
      const mockRefund = {
        id: "refund-1",
        status: RefundStatus.PENDING,
        purchaserId: "user-1",
        ticket: { event: { organizerId: "organizer-1" } },
      }

      mockRefundRepository.findOne.mockResolvedValue(mockRefund)
      mockRefundRepository.remove.mockResolvedValue(mockRefund)

      const result = await service.cancelRefund("refund-1", "organizer-1")

      expect(result.success).toBe(true)
    })

    it("should throw ForbiddenException for unauthorized user", async () => {
      const mockRefund = {
        id: "refund-1",
        status: RefundStatus.PENDING,
        purchaserId: "user-1",
        ticket: { event: { organizerId: "organizer-1" } },
      }

      mockRefundRepository.findOne.mockResolvedValue(mockRefund)

      await expect(service.cancelRefund("refund-1", "unauthorized-user")).rejects.toThrow(ForbiddenException)
    })

    it("should throw BadRequestException for non-pending refund", async () => {
      const mockRefund = {
        id: "refund-1",
        status: RefundStatus.PROCESSED,
        purchaserId: "user-1",
        ticket: { event: { organizerId: "organizer-1" } },
      }

      mockRefundRepository.findOne.mockResolvedValue(mockRefund)

      await expect(service.cancelRefund("refund-1", "user-1")).rejects.toThrow(BadRequestException)
    })
  })
})
