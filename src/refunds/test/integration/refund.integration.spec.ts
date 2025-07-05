import { Test, type TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { RefundsModule } from "../../refunds.module"
import { RefundService } from "../../services/refund.service"
import { Refund, RefundStatus, RefundReason } from "../../entities/refund.entity"
import { Event } from "../../../ticketing/entities/event.entity"
import { Ticket, TicketStatus } from "../../../ticketing/entities/ticket.entity"

describe("Refund Integration Tests", () => {
  let module: TestingModule
  let refundService: RefundService
  let refundRepository: Repository<Refund>
  let eventRepository: Repository<Event>
  let ticketRepository: Repository<Ticket>

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "sqlite",
          database: ":memory:",
          entities: [Refund, Event, Ticket],
          synchronize: true,
        }),
        RefundsModule,
      ],
    }).compile()

    refundService = module.get<RefundService>(RefundService)
    refundRepository = module.get("RefundRepository")
    eventRepository = module.get("EventRepository")
    ticketRepository = module.get("TicketRepository")
  })

  afterAll(async () => {
    await module.close()
  })

  beforeEach(async () => {
    // Clean up database before each test
    await refundRepository.clear()
    await ticketRepository.clear()
    await eventRepository.clear()
  })

  describe("End-to-End Refund Flow", () => {
    it("should complete full refund lifecycle", async () => {
      // 1. Create an event
      const event = await eventRepository.save({
        name: "Refund Test Event",
        description: "Event for testing refunds",
        startDate: new Date("2024-12-01T09:00:00"),
        endDate: new Date("2024-12-01T18:00:00"),
        location: "Test Venue",
        organizerId: "organizer-123",
        ticketPrice: 100.0,
        maxCapacity: 50,
        isActive: true,
      })

      // 2. Create a ticket
      const ticket = await ticketRepository.save({
        ticketNumber: "REFUND-TEST-001",
        eventId: event.id,
        purchaserId: "user-123",
        purchaserName: "John Doe",
        purchaserEmail: "john@example.com",
        qrCodeData: "test-qr-data",
        qrCodeImage: "test-qr-image",
        secureHash: "test-hash",
        status: TicketStatus.ACTIVE,
        pricePaid: 100.0,
        purchaseDate: new Date(),
      })

      // 3. Create a refund request
      const refundResult = await refundService.createRefund({
        ticketId: ticket.id,
        processedBy: "organizer-123",
        refundPercentage: 75,
        reason: RefundReason.CUSTOMER_REQUEST,
        reasonDescription: "Customer unable to attend due to illness",
        internalNotes: "Medical emergency documented",
        customerMessage: "We understand your situation and have processed a partial refund",
      })

      expect(refundResult.refundAmount).toBe(75)
      expect(refundResult.refundPercentage).toBe(75)
      expect(refundResult.isPartialRefund).toBe(true)
      expect(refundResult.status).toBe(RefundStatus.PENDING)

      // 4. Process the refund
      const processedRefund = await refundService.processRefund(refundResult.id, {
        status: RefundStatus.PROCESSED,
        refundTransactionId: "txn-123456789",
        customerMessage: "Your refund has been processed and will appear in your account within 3-5 business days",
      })

      expect(processedRefund.status).toBe(RefundStatus.PROCESSED)
      expect(processedRefund.refundTransactionId).toBe("txn-123456789")
      expect(processedRefund.processedAt).toBeDefined()

      // 5. Verify ticket status was updated
      const updatedTicket = await ticketRepository.findOne({
        where: { id: ticket.id },
      })
      // For partial refunds, ticket remains active but refund is recorded
      expect(updatedTicket?.status).toBe(TicketStatus.ACTIVE)

      // 6. Get refund statistics
      const stats = await refundService.getRefundStats(event.id, "organizer-123")
      expect(stats.totalRefunds).toBe(1)
      expect(stats.totalRefundAmount).toBe(75)
      expect(stats.processedRefunds).toBe(1)
      expect(stats.pendingRefunds).toBe(0)
      expect(stats.refundsByReason[RefundReason.CUSTOMER_REQUEST]).toBe(1)
    })

    it("should handle full refund and cancel ticket", async () => {
      // Create event and ticket
      const event = await eventRepository.save({
        name: "Full Refund Test Event",
        startDate: new Date("2024-12-01T09:00:00"),
        endDate: new Date("2024-12-01T18:00:00"),
        location: "Test Venue",
        organizerId: "organizer-123",
        ticketPrice: 150.0,
        maxCapacity: 100,
        isActive: true,
      })

      const ticket = await ticketRepository.save({
        ticketNumber: "FULL-REFUND-001",
        eventId: event.id,
        purchaserId: "user-456",
        purchaserName: "Jane Smith",
        purchaserEmail: "jane@example.com",
        qrCodeData: "test-qr-data-2",
        qrCodeImage: "test-qr-image-2",
        secureHash: "test-hash-2",
        status: TicketStatus.ACTIVE,
        pricePaid: 150.0,
        purchaseDate: new Date(),
      })

      // Create and auto-process full refund
      const refundResult = await refundService.createRefund({
        ticketId: ticket.id,
        processedBy: "organizer-123",
        refundPercentage: 100,
        reason: RefundReason.EVENT_CANCELLED,
        reasonDescription: "Event cancelled due to venue issues",
        autoProcess: true,
      })

      expect(refundResult.refundAmount).toBe(150)
      expect(refundResult.refundPercentage).toBe(100)
      expect(refundResult.isPartialRefund).toBe(false)
      expect(refundResult.status).toBe(RefundStatus.APPROVED)

      // Verify ticket was cancelled for full refund
      const updatedTicket = await ticketRepository.findOne({
        where: { id: ticket.id },
      })
      expect(updatedTicket?.status).toBe(TicketStatus.CANCELLED)
    })

    it("should process bulk refunds for event cancellation", async () => {
      // Create event
      const event = await eventRepository.save({
        name: "Bulk Refund Test Event",
        startDate: new Date("2024-12-01T09:00:00"),
        endDate: new Date("2024-12-01T18:00:00"),
        location: "Test Venue",
        organizerId: "organizer-123",
        ticketPrice: 75.0,
        maxCapacity: 100,
        isActive: true,
      })

      // Create multiple tickets
      const tickets = await Promise.all([
        ticketRepository.save({
          ticketNumber: "BULK-001",
          eventId: event.id,
          purchaserId: "user-1",
          purchaserName: "User One",
          purchaserEmail: "user1@example.com",
          qrCodeData: "qr-1",
          qrCodeImage: "img-1",
          secureHash: "hash-1",
          status: TicketStatus.ACTIVE,
          pricePaid: 75.0,
          purchaseDate: new Date(),
        }),
        ticketRepository.save({
          ticketNumber: "BULK-002",
          eventId: event.id,
          purchaserId: "user-2",
          purchaserName: "User Two",
          purchaserEmail: "user2@example.com",
          qrCodeData: "qr-2",
          qrCodeImage: "img-2",
          secureHash: "hash-2",
          status: TicketStatus.ACTIVE,
          pricePaid: 75.0,
          purchaseDate: new Date(),
        }),
        ticketRepository.save({
          ticketNumber: "BULK-003",
          eventId: event.id,
          purchaserId: "user-3",
          purchaserName: "User Three",
          purchaserEmail: "user3@example.com",
          qrCodeData: "qr-3",
          qrCodeImage: "img-3",
          secureHash: "hash-3",
          status: TicketStatus.ACTIVE,
          pricePaid: 75.0,
          purchaseDate: new Date(),
        }),
      ])

      // Process event cancellation refunds
      const bulkResult = await refundService.processEventCancellationRefunds(
        event.id,
        "organizer-123",
        100, // 100% refund
        0, // No processing fee
      )

      expect(bulkResult.success).toBe(true)
      expect(bulkResult.processedRefunds).toHaveLength(3)
      expect(bulkResult.failedRefunds).toHaveLength(0)
      expect(bulkResult.totalAmount).toBe(225) // 3 * 75

      // Verify all tickets were cancelled
      const updatedTickets = await ticketRepository.find({
        where: { eventId: event.id },
      })
      expect(updatedTickets.every((t) => t.status === TicketStatus.CANCELLED)).toBe(true)

      // Verify refunds were created
      const refunds = await refundRepository.find({
        where: { eventId: event.id },
      })
      expect(refunds).toHaveLength(3)
      expect(refunds.every((r) => r.reason === RefundReason.EVENT_CANCELLED)).toBe(true)
      expect(refunds.every((r) => r.status === RefundStatus.APPROVED)).toBe(true)
    })

    it("should handle partial bulk refunds with processing fees", async () => {
      // Create event
      const event = await eventRepository.save({
        name: "Partial Bulk Refund Event",
        startDate: new Date("2024-12-01T09:00:00"),
        endDate: new Date("2024-12-01T18:00:00"),
        location: "Test Venue",
        organizerId: "organizer-123",
        ticketPrice: 100.0,
        maxCapacity: 50,
        isActive: true,
      })

      // Create tickets
      const tickets = await Promise.all([
        ticketRepository.save({
          ticketNumber: "PARTIAL-001",
          eventId: event.id,
          purchaserId: "user-1",
          purchaserName: "User One",
          purchaserEmail: "user1@example.com",
          qrCodeData: "qr-1",
          qrCodeImage: "img-1",
          secureHash: "hash-1",
          status: TicketStatus.ACTIVE,
          pricePaid: 100.0,
          purchaseDate: new Date(),
        }),
        ticketRepository.save({
          ticketNumber: "PARTIAL-002",
          eventId: event.id,
          purchaserId: "user-2",
          purchaserName: "User Two",
          purchaserEmail: "user2@example.com",
          qrCodeData: "qr-2",
          qrCodeImage: "img-2",
          secureHash: "hash-2",
          status: TicketStatus.ACTIVE,
          pricePaid: 100.0,
          purchaseDate: new Date(),
        }),
      ])

      // Process bulk partial refunds
      const bulkResult = await refundService.processBulkRefunds({
        ticketIds: tickets.map((t) => t.id),
        processedBy: "organizer-123",
        refundPercentage: 80,
        processingFee: 5.0,
        reason: RefundReason.EVENT_POSTPONED,
        reasonDescription: "Event postponed, offering 80% refund",
        customerMessage: "Event postponed. You can attend the new date or accept this partial refund.",
        autoProcess: true,
      })

      expect(bulkResult.success).toBe(true)
      expect(bulkResult.processedRefunds).toHaveLength(2)
      expect(bulkResult.totalAmount).toBe(160) // 2 * 80

      // Verify refunds have correct amounts and fees
      const refunds = await refundRepository.find({
        where: { eventId: event.id },
      })
      expect(refunds).toHaveLength(2)
      expect(refunds.every((r) => r.refundAmount === 80)).toBe(true)
      expect(refunds.every((r) => r.processingFee === 5)).toBe(true)
      expect(refunds.every((r) => r.isPartialRefund === true)).toBe(true)
      expect(refunds.every((r) => r.refundPercentage === 80)).toBe(true)

      // Tickets should remain active for partial refunds
      const updatedTickets = await ticketRepository.find({
        where: { eventId: event.id },
      })
      expect(updatedTickets.every((t) => t.status === TicketStatus.ACTIVE)).toBe(true)
    })

    it("should prevent duplicate refunds", async () => {
      // Create event and ticket
      const event = await eventRepository.save({
        name: "Duplicate Refund Test",
        startDate: new Date("2024-12-01T09:00:00"),
        endDate: new Date("2024-12-01T18:00:00"),
        location: "Test Venue",
        organizerId: "organizer-123",
        ticketPrice: 50.0,
        maxCapacity: 100,
        isActive: true,
      })

      const ticket = await ticketRepository.save({
        ticketNumber: "DUPLICATE-001",
        eventId: event.id,
        purchaserId: "user-123",
        purchaserName: "John Doe",
        purchaserEmail: "john@example.com",
        qrCodeData: "qr-data",
        qrCodeImage: "qr-image",
        secureHash: "hash",
        status: TicketStatus.ACTIVE,
        pricePaid: 50.0,
        purchaseDate: new Date(),
      })

      // Create first refund
      const firstRefund = await refundService.createRefund({
        ticketId: ticket.id,
        processedBy: "organizer-123",
        reason: RefundReason.CUSTOMER_REQUEST,
      })

      expect(firstRefund).toBeDefined()

      // Try to create second refund for same ticket (should fail)
      await expect(
        refundService.createRefund({
          ticketId: ticket.id,
          processedBy: "organizer-123",
          reason: RefundReason.DUPLICATE_PURCHASE,
        }),
      ).rejects.toThrow("Refund request already exists for this ticket")
    })

    it("should handle refund cancellation", async () => {
      // Create event and ticket
      const event = await eventRepository.save({
        name: "Refund Cancellation Test",
        startDate: new Date("2024-12-01T09:00:00"),
        endDate: new Date("2024-12-01T18:00:00"),
        location: "Test Venue",
        organizerId: "organizer-123",
        ticketPrice: 80.0,
        maxCapacity: 100,
        isActive: true,
      })

      const ticket = await ticketRepository.save({
        ticketNumber: "CANCEL-001",
        eventId: event.id,
        purchaserId: "user-123",
        purchaserName: "John Doe",
        purchaserEmail: "john@example.com",
        qrCodeData: "qr-data",
        qrCodeImage: "qr-image",
        secureHash: "hash",
        status: TicketStatus.ACTIVE,
        pricePaid: 80.0,
        purchaseDate: new Date(),
      })

      // Create refund request
      const refund = await refundService.createRefund({
        ticketId: ticket.id,
        processedBy: "organizer-123",
        reason: RefundReason.CUSTOMER_REQUEST,
      })

      expect(refund.status).toBe(RefundStatus.PENDING)

      // Cancel the refund request
      const cancelResult = await refundService.cancelRefund(refund.id, "user-123")
      expect(cancelResult.success).toBe(true)

      // Verify refund was removed
      const deletedRefund = await refundRepository.findOne({
        where: { id: refund.id },
      })
      expect(deletedRefund).toBeNull()
    })
  })

  describe("Authorization and Security", () => {
    it("should enforce organizer authorization for event refunds", async () => {
      const event = await eventRepository.save({
        name: "Authorization Test Event",
        startDate: new Date("2024-12-01T09:00:00"),
        endDate: new Date("2024-12-01T18:00:00"),
        location: "Test Venue",
        organizerId: "organizer-123",
        ticketPrice: 100.0,
        maxCapacity: 100,
        isActive: true,
      })

      // Try to get refunds with wrong organizer ID
      await expect(refundService.getRefundsByEvent(event.id, "wrong-organizer")).rejects.toThrow(
        "You don't have permission to view refunds for this event",
      )

      // Try to get stats with wrong organizer ID
      await expect(refundService.getRefundStats(event.id, "wrong-organizer")).rejects.toThrow(
        "You don't have permission to view refund stats for this event",
      )

      // Try to process event cancellation with wrong organizer ID
      await expect(refundService.processEventCancellationRefunds(event.id, "wrong-organizer")).rejects.toThrow(
        "You don't have permission to process refunds for this event",
      )
    })

    it("should enforce refund cancellation authorization", async () => {
      const event = await eventRepository.save({
        name: "Cancellation Auth Test",
        startDate: new Date("2024-12-01T09:00:00"),
        endDate: new Date("2024-12-01T18:00:00"),
        location: "Test Venue",
        organizerId: "organizer-123",
        ticketPrice: 100.0,
        maxCapacity: 100,
        isActive: true,
      })

      const ticket = await ticketRepository.save({
        ticketNumber: "AUTH-001",
        eventId: event.id,
        purchaserId: "user-123",
        purchaserName: "John Doe",
        purchaserEmail: "john@example.com",
        qrCodeData: "qr-data",
        qrCodeImage: "qr-image",
        secureHash: "hash",
        status: TicketStatus.ACTIVE,
        pricePaid: 100.0,
        purchaseDate: new Date(),
      })

      const refund = await refundService.createRefund({
        ticketId: ticket.id,
        processedBy: "organizer-123",
        reason: RefundReason.CUSTOMER_REQUEST,
      })

      // Try to cancel with unauthorized user
      await expect(refundService.cancelRefund(refund.id, "unauthorized-user")).rejects.toThrow(
        "You don't have permission to cancel this refund",
      )
    })
  })
})
