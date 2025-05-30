import { Test, type TestingModule } from "@nestjs/testing"
import type { INestApplication } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import * as request from "supertest"
import { TicketTierController } from "../controllers/ticket-tier.controller"
import { TicketTier } from "../entities/ticket-tier.entity"
import { Event } from "../../events/entities/event.entity"
import { User } from "../../users/entities/user.entity"
import { EventsService } from "../../events/events.service"
import { JwtAuthGuard } from "../../../security/guards/jwt-auth.guard"
import { RolesGuard } from "../../../security/guards/rolesGuard/roles.guard"
import { TicketTierService } from "../provider/ticket-tier.service"
import { UserRole } from "src/common/enums/users-roles.enum"

describe("TicketTier Integration Tests", () => {
  let app: INestApplication
  let ticketTierRepository: Repository<TicketTier>
  let eventRepository: Repository<Event>
  let userRepository: Repository<User>

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  }

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "sqlite",
          database: ":memory:",
          entities: [TicketTier, Event, User],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([TicketTier, Event, User]),
      ],
      controllers: [TicketTierController],
      providers: [
        TicketTierService,
        {
          provide: EventsService,
          useValue: {
            getEventById: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    ticketTierRepository = moduleFixture.get("TicketTierRepository")
    eventRepository = moduleFixture.get("EventRepository")
    userRepository = moduleFixture.get("UserRepository")
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await ticketTierRepository.clear()
    await eventRepository.clear()
    await userRepository.clear()
  })

  describe("POST /events/:eventId/ticket-tiers", () => {
    it("should create a new ticket tier", async () => {
      // Setup test data
      const user = await userRepository.save({
        email: "organizer@test.com",
        role: UserRole.Organizer,
      })

      const event = await eventRepository.save({
        id: "event-1",
        eventName: "Test Event",
        organizerId: "user-1",
        eventDate: new Date(),
        eventClosingDate: new Date(),
        eventDescription: "Test Description",
        country: "Test Country",
        state: "Test State",
        street: "Test Street",
        localGovernment: "Test LG",
      })

      const createTicketTierDto = {
        name: "VIP Pass",
        description: "Premium access with backstage pass",
        price: 199.99,
        totalQuantity: 100,
        benefits: ["Backstage access", "Meet & greet"],
        isActive: true,
        sortOrder: 1,
      }

      // Mock the EventsService
      const eventsService = app.get(EventsService)
      ;(eventsService.getEventById as jest.Mock).mockResolvedValue(event)

      const response = await request(app.getHttpServer())
        .post(`/events/${event.id}/ticket-tiers`)
        .send(createTicketTierDto)
        .expect(201)

      expect(response.body).toMatchObject({
        name: "VIP Pass",
        price: 199.99,
        totalQuantity: 100,
        soldQuantity: 0,
        isActive: true,
      })

      // Verify in database
      const savedTier = await ticketTierRepository.findOne({
        where: { name: "VIP Pass" },
      })
      expect(savedTier).toBeDefined()
      expect(savedTier.eventId).toBe(event.id)
    })

    it("should return 409 for duplicate tier name", async () => {
      const user = await userRepository.save({
        id: 1,
        email: "organizer@test.com",
        role: UserRole.Organizer,
      })

      const event = await eventRepository.save({
        id: "event-1",
        eventName: "Test Event",
        organizerId: "user-1",
        eventDate: new Date(),
        eventClosingDate: new Date(),
        eventDescription: "Test Description",
        country: "Test Country",
        state: "Test State",
        street: "Test Street",
        localGovernment: "Test LG",
      })

      // Create existing tier
      await ticketTierRepository.save({
        id: "existing-tier",
        name: "VIP Pass",
        eventId: event.id,
        description: "Existing tier",
        price: 150,
        totalQuantity: 50,
        soldQuantity: 0,
        benefits: ["Access"],
        isActive: true,
        sortOrder: 1,
      })

      const createTicketTierDto = {
        name: "VIP Pass", // Duplicate name
        description: "Premium access",
        price: 199.99,
        totalQuantity: 100,
        benefits: ["Backstage access"],
        isActive: true,
        sortOrder: 2,
      }

      const eventsService = app.get(EventsService)
      ;(eventsService.getEventById as jest.Mock).mockResolvedValue(event)

      await request(app.getHttpServer()).post(`/events/${event.id}/ticket-tiers`).send(createTicketTierDto).expect(409)
    })
  })

  describe("GET /events/:eventId/ticket-tiers", () => {
    it("should return all ticket tiers for an event", async () => {
      const event = await eventRepository.save({
        id: "event-1",
        eventName: "Test Event",
        eventDate: new Date(),
        eventClosingDate: new Date(),
        eventDescription: "Test Description",
        country: "Test Country",
        state: "Test State",
        street: "Test Street",
        localGovernment: "Test LG",
      })

      // Create test tiers
      await ticketTierRepository.save([
        {
          id: "tier-1",
          name: "VIP",
          eventId: event.id,
          description: "VIP access",
          price: 199.99,
          totalQuantity: 100,
          soldQuantity: 25,
          benefits: ["Backstage access"],
          isActive: true,
          sortOrder: 1,
        },
        {
          id: "tier-2",
          name: "General",
          eventId: event.id,
          description: "General admission",
          price: 99.99,
          totalQuantity: 500,
          soldQuantity: 150,
          benefits: ["Event access"],
          isActive: true,
          sortOrder: 2,
        },
      ])

      const eventsService = app.get(EventsService)
      ;(eventsService.getEventById as jest.Mock).mockResolvedValue(event)

      const response = await request(app.getHttpServer()).get(`/events/${event.id}/ticket-tiers`).expect(200)

      expect(response.body).toHaveLength(2)
      expect(response.body[0].name).toBe("VIP")
      expect(response.body[1].name).toBe("General")
    })

    it("should return only available tiers when availableOnly=true", async () => {
      const event = await eventRepository.save({
        id: "event-1",
        eventName: "Test Event",
        eventDate: new Date(),
        eventClosingDate: new Date(),
        eventDescription: "Test Description",
        country: "Test Country",
        state: "Test State",
        street: "Test Street",
        localGovernment: "Test LG",
      })

      // Create test tiers - one available, one sold out
      await ticketTierRepository.save([
        {
          id: "tier-1",
          name: "Available Tier",
          eventId: event.id,
          description: "Available tier",
          price: 99.99,
          totalQuantity: 100,
          soldQuantity: 50,
          benefits: ["Access"],
          isActive: true,
          sortOrder: 1,
        },
        {
          id: "tier-2",
          name: "Sold Out Tier",
          eventId: event.id,
          description: "Sold out tier",
          price: 199.99,
          totalQuantity: 50,
          soldQuantity: 50, // Sold out
          benefits: ["Premium access"],
          isActive: true,
          sortOrder: 2,
        },
      ])

      const eventsService = app.get(EventsService)
      ;(eventsService.getEventById as jest.Mock).mockResolvedValue(event)

      const response = await request(app.getHttpServer())
        .get(`/events/${event.id}/ticket-tiers?availableOnly=true`)
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0].name).toBe("Available Tier")
    })
  })

  describe("PUT /events/:eventId/ticket-tiers/:tierId", () => {
    it("should update a ticket tier successfully", async () => {
      const user = await userRepository.save({
        id: 1,
        email: "organizer@test.com",
        role: UserRole.Organizer,
      })

      const event = await eventRepository.save({
        id: "event-1",
        eventName: "Test Event",
        organizerId: "user-1",
        eventDate: new Date(),
        eventClosingDate: new Date(),
        eventDescription: "Test Description",
        country: "Test Country",
        state: "Test State",
        street: "Test Street",
        localGovernment: "Test LG",
      })

      const tier = await ticketTierRepository.save({
        id: "tier-1",
        name: "VIP Pass",
        eventId: event.id,
        description: "Premium access",
        price: 199.99,
        totalQuantity: 100,
        soldQuantity: 25,
        benefits: ["Backstage access"],
        isActive: true,
        sortOrder: 1,
      })

      const updateDto = {
        name: "Premium VIP Pass",
        totalQuantity: 150,
      }

      const eventsService = app.get(EventsService)
      ;(eventsService.getEventById as jest.Mock).mockResolvedValue({
        ...event,
        organizerId: "user-1",
      })

      const response = await request(app.getHttpServer())
        .put(`/events/${event.id}/ticket-tiers/${tier.id}`)
        .send(updateDto)
        .expect(200)

      expect(response.body.name).toBe("Premium VIP Pass")
      expect(response.body.totalQuantity).toBe(150)

      // Verify in database
      const updatedTier = await ticketTierRepository.findOne({
        where: { id: tier.id },
      })
      expect(updatedTier.name).toBe("Premium VIP Pass")
      expect(updatedTier.totalQuantity).toBe(150)
    })
  })

  describe("DELETE /events/:eventId/ticket-tiers/:tierId", () => {
    it("should delete a ticket tier with no sold tickets", async () => {
      const user = await userRepository.save({
        email: "organizer@test.com",
        role: UserRole.Organizer,
      })

      const event = await eventRepository.save({
        id: "event-1",
        eventName: "Test Event",
        organizerId: "user-1",
        eventDate: new Date(),
        eventClosingDate: new Date(),
        eventDescription: "Test Description",
        country: "Test Country",
        state: "Test State",
        street: "Test Street",
        localGovernment: "Test LG",
      })

      const tier = await ticketTierRepository.save({
        id: "tier-1",
        name: "VIP Pass",
        eventId: event.id,
        description: "Premium access",
        price: 199.99,
        totalQuantity: 100,
        soldQuantity: 0, // No sold tickets
        benefits: ["Backstage access"],
        isActive: true,
        sortOrder: 1,
      })

      const eventsService = app.get(EventsService)
      ;(eventsService.getEventById as jest.Mock).mockResolvedValue({
        ...event,
        organizerId: "user-1",
      })

      await request(app.getHttpServer()).delete(`/events/${event.id}/ticket-tiers/${tier.id}`).expect(200)

      // Verify deletion
      const deletedTier = await ticketTierRepository.findOne({
        where: { id: tier.id },
      })
      expect(deletedTier).toBeNull()
    })

    it("should return 409 when trying to delete tier with sold tickets", async () => {
      const user = await userRepository.save({
        email: "organizer@test.com",
        role: UserRole.Organizer,
      })

      const event = await eventRepository.save({
        id: "event-1",
        eventName: "Test Event",
        organizerId: "user-1",
        eventDate: new Date(),
        eventClosingDate: new Date(),
        eventDescription: "Test Description",
        country: "Test Country",
        state: "Test State",
        street: "Test Street",
        localGovernment: "Test LG",
      })

      const tier = await ticketTierRepository.save({
        id: "tier-1",
        name: "VIP Pass",
        eventId: event.id,
        description: "Premium access",
        price: 199.99,
        totalQuantity: 100,
        soldQuantity: 25, // Has sold tickets
        benefits: ["Backstage access"],
        isActive: true,
        sortOrder: 1,
      })

      const eventsService = app.get(EventsService)
      ;(eventsService.getEventById as jest.Mock).mockResolvedValue({
        ...event,
        organizerId: "user-1",
      })

      await request(app.getHttpServer()).delete(`/events/${event.id}/ticket-tiers/${tier.id}`).expect(409)

      // Verify tier still exists
      const existingTier = await ticketTierRepository.findOne({
        where: { id: tier.id },
      })
      expect(existingTier).toBeDefined()
    })
  })
})
