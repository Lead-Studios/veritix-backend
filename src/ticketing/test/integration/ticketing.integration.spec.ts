import { Test, type TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { TicketingModule } from "../../ticketing.module"
import { TicketingService } from "../../services/ticketing.service"
import { QrCodeService } from "../../services/qr-code.service"
import { Event } from "../../entities/event.entity"
import { Ticket, TicketStatus } from "../../entities/ticket.entity"

describe("Ticketing Integration Tests", () => {
  let module: TestingModule
  let ticketingService: TicketingService
  let qrCodeService: QrCodeService
  let eventRepository: Repository<Event>
  let ticketRepository: Repository<Ticket>

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "sqlite",
          database: ":memory:",
          entities: [Event, Ticket],
          synchronize: true,
        }),
        TicketingModule,
      ],
    }).compile()

    ticketingService = module.get<TicketingService>(TicketingService)
    qrCodeService = module.get<QrCodeService>(QrCodeService)
    eventRepository = module.get("EventRepository")
    ticketRepository = module.get("TicketRepository")
  })

  afterAll(async () => {
    await module.close()
  })

  beforeEach(async () => {
    // Clean up database before each test
    await ticketRepository.clear()
    await eventRepository.clear()
  })

  describe("End-to-End Ticket Flow", () => {
    it("should complete full ticket lifecycle", async () => {
      // 1. Create an event
      const event = await eventRepository.save({
        name: "Integration Test Event",
        description: "Test event for integration testing",
        startDate: new Date("2024-12-01T09:00:00"),
        endDate: new Date("2024-12-01T18:00:00"),
        location: "Test Venue",
        organizerId: "organizer-123",
        ticketPrice: 50.0,
        maxCapacity: 100,
        isActive: true,
      })

      // 2. Purchase tickets
      const purchaseResult = await ticketingService.purchaseTickets({
        eventId: event.id,
        purchaserId: "user-123",
        purchaserName: "John Doe",
        purchaserEmail: "john@example.com",
        quantity: 2,
      })

      expect(purchaseResult.success).toBe(true)
      expect(purchaseResult.tickets).toHaveLength(2)
      expect(purchaseResult.totalAmount).toBe(100)

      const ticket = purchaseResult.tickets[0]
      expect(ticket.qrCodeImage).toMatch(/^data:image\/png;base64,/)

      // 3. Verify QR code can be decoded
      const qrVerification = qrCodeService.verifyQrCode(ticket.qrCodeImage.replace("data:image/png;base64,", ""))
      // Note: In real implementation, we'd need to decode the base64 image first
      // For this test, we'll use the stored qrCodeData

      const storedTicket = await ticketRepository.findOne({
        where: { id: ticket.id },
      })
      expect(storedTicket).toBeDefined()

      const qrDataVerification = qrCodeService.verifyQrCode(storedTicket!.qrCodeData)
      expect(qrDataVerification.isValid).toBe(true)
      expect(qrDataVerification.payload?.ticketId).toBe(ticket.id)

      // 4. Scan the ticket
      const scanResult = await ticketingService.scanTicket({
        qrCodeData: storedTicket!.qrCodeData,
        scannedBy: "scanner-123",
        eventId: event.id,
      })

      expect(scanResult.success).toBe(true)
      expect(scanResult.message).toBe("Ticket successfully validated")
      expect(scanResult.ticket?.status).toBe(TicketStatus.USED)

      // 5. Try to scan the same ticket again (should fail)
      const secondScanResult = await ticketingService.scanTicket({
        qrCodeData: storedTicket!.qrCodeData,
        scannedBy: "scanner-123",
        eventId: event.id,
      })

      expect(secondScanResult.success).toBe(false)
      expect(secondScanResult.message).toBe("Ticket has already been used")

      // 6. Verify ticket status in database
      const updatedTicket = await ticketRepository.findOne({
        where: { id: ticket.id },
      })
      expect(updatedTicket?.status).toBe(TicketStatus.USED)
      expect(updatedTicket?.usedAt).toBeDefined()
      expect(updatedTicket?.scannedBy).toBe("scanner-123")

      // 7. Get event statistics
      const stats = await ticketingService.getEventStats(event.id, "organizer-123")
      expect(stats.totalTickets).toBe(2)
      expect(stats.soldTickets).toBe(2)
      expect(stats.usedTickets).toBe(1)
      expect(stats.cancelledTickets).toBe(0)
      expect(stats.revenue).toBe(100)
      expect(stats.availableCapacity).toBe(98)
    })

    it("should handle capacity limits correctly", async () => {
      // Create event with limited capacity
      const event = await eventRepository.save({
        name: "Limited Capacity Event",
        description: "Event with only 2 seats",
        startDate: new Date("2024-12-01T09:00:00"),
        endDate: new Date("2024-12-01T18:00:00"),
        location: "Small Venue",
        organizerId: "organizer-123",
        ticketPrice: 25.0,
        maxCapacity: 2,
        isActive: true,
      })

      // Purchase 2 tickets (should succeed)
      const firstPurchase = await ticketingService.purchaseTickets({
        eventId: event.id,
        purchaserId: "user-1",
        purchaserName: "User One",
        purchaserEmail: "user1@example.com",
        quantity: 2,
      })

      expect(firstPurchase.success).toBe(true)
      expect(firstPurchase.tickets).toHaveLength(2)

      // Try to purchase 1 more ticket (should fail)
      await expect(
        ticketingService.purchaseTickets({
          eventId: event.id,
          purchaserId: "user-2",
          purchaserName: "User Two",
          purchaserEmail: "user2@example.com",
          quantity: 1,
        }),
      ).rejects.toThrow("Not enough tickets available")
    })

    it("should handle ticket cancellation correctly", async () => {
      // Create event
      const event = await eventRepository.save({
        name: "Cancellation Test Event",
        description: "Event for testing cancellations",
        startDate: new Date("2024-12-01T09:00:00"),
        endDate: new Date("2024-12-01T18:00:00"),
        location: "Test Venue",
        organizerId: "organizer-123",
        ticketPrice: 75.0,
        maxCapacity: 50,
        isActive: true,
      })

      // Purchase ticket
      const purchaseResult = await ticketingService.purchaseTickets({
        eventId: event.id,
        purchaserId: "user-123",
        purchaserName: "John Doe",
        purchaserEmail: "john@example.com",
        quantity: 1,
      })

      const ticketId = purchaseResult.tickets[0].id

      // Cancel ticket by purchaser
      const cancelResult = await ticketingService.cancelTicket(ticketId, "user-123")
      expect(cancelResult.success).toBe(true)

      // Verify ticket status
      const cancelledTicket = await ticketRepository.findOne({
        where: { id: ticketId },
      })
      expect(cancelledTicket?.status).toBe(TicketStatus.CANCELLED)

      // Try to scan cancelled ticket (should fail)
      const scanResult = await ticketingService.scanTicket({
        qrCodeData: cancelledTicket!.qrCodeData,
        scannedBy: "scanner-123",
        eventId: event.id,
      })

      expect(scanResult.success).toBe(false)
      expect(scanResult.message).toBe("Ticket has been cancelled")
    })

    it("should prevent scanning tickets for wrong events", async () => {
      // Create two events
      const event1 = await eventRepository.save({
        name: "Event 1",
        startDate: new Date("2024-12-01T09:00:00"),
        endDate: new Date("2024-12-01T18:00:00"),
        location: "Venue 1",
        organizerId: "organizer-123",
        ticketPrice: 50.0,
        maxCapacity: 100,
        isActive: true,
      })

      const event2 = await eventRepository.save({
        name: "Event 2",
        startDate: new Date("2024-12-02T09:00:00"),
        endDate: new Date("2024-12-02T18:00:00"),
        location: "Venue 2",
        organizerId: "organizer-123",
        ticketPrice: 60.0,
        maxCapacity: 100,
        isActive: true,
      })

      // Purchase ticket for event1
      const purchaseResult = await ticketingService.purchaseTickets({
        eventId: event1.id,
        purchaserId: "user-123",
        purchaserName: "John Doe",
        purchaserEmail: "john@example.com",
        quantity: 1,
      })

      const ticket = await ticketRepository.findOne({
        where: { id: purchaseResult.tickets[0].id },
      })

      // Try to scan event1 ticket at event2 (should fail)
      const scanResult = await ticketingService.scanTicket({
        qrCodeData: ticket!.qrCodeData,
        scannedBy: "scanner-123",
        eventId: event2.id,
      })

      expect(scanResult.success).toBe(false)
      expect(scanResult.message).toBe("Ticket is not valid for this event")
    })
  })

  describe("QR Code Security", () => {
    it("should reject tampered QR codes", async () => {
      // Create event and purchase ticket
      const event = await eventRepository.save({
        name: "Security Test Event",
        startDate: new Date("2024-12-01T09:00:00"),
        endDate: new Date("2024-12-01T18:00:00"),
        location: "Secure Venue",
        organizerId: "organizer-123",
        ticketPrice: 100.0,
        maxCapacity: 50,
        isActive: true,
      })

      const purchaseResult = await ticketingService.purchaseTickets({
        eventId: event.id,
        purchaserId: "user-123",
        purchaserName: "John Doe",
        purchaserEmail: "john@example.com",
        quantity: 1,
      })

      const ticket = await ticketRepository.findOne({
        where: { id: purchaseResult.tickets[0].id },
      })

      // Tamper with QR code data
      const qrData = JSON.parse(ticket!.qrCodeData)
      qrData.purchaserId = "different-user" // Change purchaser ID
      const tamperedQrCode = JSON.stringify(qrData)

      // Try to scan tampered QR code (should fail)
      const scanResult = await ticketingService.scanTicket({
        qrCodeData: tamperedQrCode,
        scannedBy: "scanner-123",
        eventId: event.id,
      })

      expect(scanResult.success).toBe(false)
      expect(scanResult.message).toBe("Invalid QR code")
      expect(scanResult.error).toBe("QR code has been tampered with")
    })

    it("should generate unique QR codes for each ticket", async () => {
      const event = await eventRepository.save({
        name: "Uniqueness Test Event",
        startDate: new Date("2024-12-01T09:00:00"),
        endDate: new Date("2024-12-01T18:00:00"),
        location: "Test Venue",
        organizerId: "organizer-123",
        ticketPrice: 50.0,
        maxCapacity: 100,
        isActive: true,
      })

      // Purchase multiple tickets
      const purchaseResult = await ticketingService.purchaseTickets({
        eventId: event.id,
        purchaserId: "user-123",
        purchaserName: "John Doe",
        purchaserEmail: "john@example.com",
        quantity: 3,
      })

      const tickets = await ticketRepository.find({
        where: { eventId: event.id },
      })

      // Verify all QR codes are unique
      const qrCodes = tickets.map((t) => t.qrCodeData)
      const uniqueQrCodes = new Set(qrCodes)
      expect(uniqueQrCodes.size).toBe(tickets.length)

      // Verify all ticket numbers are unique
      const ticketNumbers = tickets.map((t) => t.ticketNumber)
      const uniqueTicketNumbers = new Set(ticketNumbers)
      expect(uniqueTicketNumbers.size).toBe(tickets.length)
    })
  })
})
