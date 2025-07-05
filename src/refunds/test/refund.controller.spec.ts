import { Test, type TestingModule } from "@nestjs/testing"
import { RefundController, TicketRefundController } from "../controllers/refund.controller"
import { RefundService } from "../services/refund.service"
import { RefundReason, RefundStatus } from "../entities/refund.entity"
import type { CreateRefundDto } from "../dto/create-refund.dto"
import type { BulkRefundDto } from "../dto/bulk-refund.dto"
import { jest } from "@jest/globals"

describe("RefundController", () => {
  let controller: RefundController
  let ticketController: TicketRefundController
  let refundService: RefundService

  const mockRefundService = {
    createRefund: jest.fn(),
    processBulkRefunds: jest.fn(),
    processEventCancellationRefunds: jest.fn(),
    getRefund: jest.fn(),
    getRefundsByEvent: jest.fn(),
    getRefundsByPurchaser: jest.fn(),
    getRefundStats: jest.fn(),
    processRefund: jest.fn(),
    cancelRefund: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefundController, TicketRefundController],
      providers: [
        {
          provide: RefundService,
          useValue: mockRefundService,
        },
      ],
    }).compile()

    controller = module.get<RefundController>(RefundController)
    ticketController = module.get<TicketRefundController>(TicketRefundController)
    refundService = module.get<RefundService>(RefundService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should be defined", () => {
    expect(controller).toBeDefined()
    expect(ticketController).toBeDefined()
  })

  describe("RefundController", () => {
    describe("createRefund", () => {
      it("should create a refund successfully", async () => {
        const createRefundDto: CreateRefundDto = {
          ticketId: "ticket-1",
          processedBy: "organizer-1",
          reason: RefundReason.CUSTOMER_REQUEST,
          reasonDescription: "Customer request",
        }

        const mockResponse = {
          id: "refund-1",
          ticketId: "ticket-1",
          refundAmount: 100,
          status: RefundStatus.PENDING,
        }

        mockRefundService.createRefund.mockResolvedValue(mockResponse)

        const result = await controller.createRefund(createRefundDto)

        expect(result).toEqual(mockResponse)
        expect(mockRefundService.createRefund).toHaveBeenCalledWith(createRefundDto)
      })
    })

    describe("processBulkRefunds", () => {
      it("should process bulk refunds successfully", async () => {
        const bulkRefundDto: BulkRefundDto = {
          ticketIds: ["ticket-1", "ticket-2"],
          processedBy: "organizer-1",
          reason: RefundReason.EVENT_CANCELLED,
          refundPercentage: 100,
        }

        const mockResponse = {
          success: true,
          message: "Processed 2 refunds, 0 failed",
          processedRefunds: [],
          failedRefunds: [],
          totalAmount: 250,
        }

        mockRefundService.processBulkRefunds.mockResolvedValue(mockResponse)

        const result = await controller.processBulkRefunds(bulkRefundDto)

        expect(result).toEqual(mockResponse)
        expect(mockRefundService.processBulkRefunds).toHaveBeenCalledWith(bulkRefundDto)
      })
    })

    describe("processEventCancellationRefunds", () => {
      it("should process event cancellation refunds", async () => {
        const eventId = "event-1"
        const organizerId = "organizer-1"
        const refundPercentage = 100
        const processingFee = 5

        const mockResponse = {
          success: true,
          message: "Processed 5 refunds",
          processedRefunds: [],
          failedRefunds: [],
          totalAmount: 500,
        }

        mockRefundService.processEventCancellationRefunds.mockResolvedValue(mockResponse)

        const result = await controller.processEventCancellationRefunds(
          eventId,
          organizerId,
          refundPercentage,
          processingFee,
        )

        expect(result).toEqual(mockResponse)
        expect(mockRefundService.processEventCancellationRefunds).toHaveBeenCalledWith(eventId, organizerId, 100, 5)
      })

      it("should use default values when parameters not provided", async () => {
        const eventId = "event-1"
        const organizerId = "organizer-1"

        mockRefundService.processEventCancellationRefunds.mockResolvedValue({})

        await controller.processEventCancellationRefunds(eventId, organizerId)

        expect(mockRefundService.processEventCancellationRefunds).toHaveBeenCalledWith(eventId, organizerId, 100, 0)
      })
    })

    describe("getRefund", () => {
      it("should get refund by ID", async () => {
        const refundId = "refund-1"
        const mockRefund = {
          id: refundId,
          ticketId: "ticket-1",
          refundAmount: 100,
        }

        mockRefundService.getRefund.mockResolvedValue(mockRefund)

        const result = await controller.getRefund(refundId)

        expect(result).toEqual(mockRefund)
        expect(mockRefundService.getRefund).toHaveBeenCalledWith(refundId)
      })
    })

    describe("getRefundsByEvent", () => {
      it("should get refunds by event", async () => {
        const eventId = "event-1"
        const organizerId = "organizer-1"
        const mockRefunds = [
          { id: "refund-1", eventId },
          { id: "refund-2", eventId },
        ]

        mockRefundService.getRefundsByEvent.mockResolvedValue(mockRefunds)

        const result = await controller.getRefundsByEvent(eventId, organizerId)

        expect(result).toEqual(mockRefunds)
        expect(mockRefundService.getRefundsByEvent).toHaveBeenCalledWith(eventId, organizerId)
      })
    })

    describe("getRefundsByPurchaser", () => {
      it("should get refunds by purchaser", async () => {
        const purchaserId = "user-1"
        const mockRefunds = [
          { id: "refund-1", purchaserId },
          { id: "refund-2", purchaserId },
        ]

        mockRefundService.getRefundsByPurchaser.mockResolvedValue(mockRefunds)

        const result = await controller.getRefundsByPurchaser(purchaserId)

        expect(result).toEqual(mockRefunds)
        expect(mockRefundService.getRefundsByPurchaser).toHaveBeenCalledWith(purchaserId)
      })
    })

    describe("getRefundStats", () => {
      it("should get refund statistics", async () => {
        const eventId = "event-1"
        const organizerId = "organizer-1"
        const mockStats = {
          totalRefunds: 10,
          totalRefundAmount: 1000,
          pendingRefunds: 2,
          processedRefunds: 7,
          rejectedRefunds: 1,
        }

        mockRefundService.getRefundStats.mockResolvedValue(mockStats)

        const result = await controller.getRefundStats(eventId, organizerId)

        expect(result).toEqual(mockStats)
        expect(mockRefundService.getRefundStats).toHaveBeenCalledWith(eventId, organizerId)
      })
    })

    describe("processRefund", () => {
      it("should process a refund", async () => {
        const refundId = "refund-1"
        const updateDto = {
          status: RefundStatus.PROCESSED,
          refundTransactionId: "txn-123",
        }

        const mockResponse = {
          id: refundId,
          status: RefundStatus.PROCESSED,
        }

        mockRefundService.processRefund.mockResolvedValue(mockResponse)

        const result = await controller.processRefund(refundId, updateDto)

        expect(result).toEqual(mockResponse)
        expect(mockRefundService.processRefund).toHaveBeenCalledWith(refundId, updateDto)
      })
    })

    describe("cancelRefund", () => {
      it("should cancel a refund", async () => {
        const refundId = "refund-1"
        const requesterId = "user-1"
        const mockResponse = {
          success: true,
          message: "Refund request cancelled successfully",
        }

        mockRefundService.cancelRefund.mockResolvedValue(mockResponse)

        const result = await controller.cancelRefund(refundId, requesterId)

        expect(result).toEqual(mockResponse)
        expect(mockRefundService.cancelRefund).toHaveBeenCalledWith(refundId, requesterId)
      })
    })
  })

  describe("TicketRefundController", () => {
    describe("refundTicket", () => {
      it("should create refund for specific ticket", async () => {
        const ticketId = "ticket-1"
        const refundDto = {
          processedBy: "organizer-1",
          reason: RefundReason.CUSTOMER_REQUEST,
          reasonDescription: "Customer request",
        }

        const expectedDto: CreateRefundDto = {
          ...refundDto,
          ticketId,
        }

        const mockResponse = {
          id: "refund-1",
          ticketId,
          refundAmount: 100,
        }

        mockRefundService.createRefund.mockResolvedValue(mockResponse)

        const result = await ticketController.refundTicket(ticketId, refundDto)

        expect(result).toEqual(mockResponse)
        expect(mockRefundService.createRefund).toHaveBeenCalledWith(expectedDto)
      })
    })
  })
})
