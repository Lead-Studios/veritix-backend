import { Test, type TestingModule } from "@nestjs/testing"
import { getRepositoryToken } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { TicketTierService } from "./ticket-tier.service"
import { TicketTier } from "../entities/ticket-tier.entity"
import { Event } from "../../events/entities/event.entity"
import type { User } from "../../users/entities/user.entity"
import { EventsService } from "../../events/events.service"
import type { CreateTicketTierDto } from "../dto/create-ticket-tier.dto"
import type { UpdateTicketTierDto } from "../dto/update-ticket-tier.dto"
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from "@nestjs/common"

describe("TicketTierService", () => {
  let service: TicketTierService
  let ticketTierRepository: Repository<TicketTier>
  let eventRepository: Repository<Event>
  let eventsService: EventsService

  const mockTicketTierRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  }

  const mockEventRepository = {
    findOne: jest.fn(),
  }

  const mockEventsService = {
    getEventById: jest.fn(),
  }

  const mockQueryRunner = {
    manager: {
      getRepository: jest.fn(),
      save: jest.fn(),
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketTierService,
        {
          provide: getRepositoryToken(TicketTier),
          useValue: mockTicketTierRepository,
        },
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventRepository,
        },
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
      ],
    }).compile()

    service = module.get<TicketTierService>(TicketTierService)
    ticketTierRepository = module.get<Repository<TicketTier>>(getRepositoryToken(TicketTier))
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event))
    eventsService = module.get<EventsService>(EventsService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("createTicketTier", () => {
    const mockUser: User = {
      id: "user-1",
      role: "organizer",
      userName: "mockuser",
      email: "mockuser@example.com",
      password: "mockpassword",
      firstName: "Mock",
      lastName: "User",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      profileImageUrl: "",
      conferences: [],
      isVerified: true,
    } as User

    const mockEvent: Event = {
      id: "event-1",
      eventName: "Test Event",
      organizerId: "user-1",
    } as Event

    const createTicketTierDto: CreateTicketTierDto = {
      name: "VIP Pass",
      description: "Premium access with backstage pass",
      price: 199.99,
      totalQuantity: 100,
      benefits: ["Backstage access", "Meet & greet"],
      isActive: true,
      sortOrder: 1,
    }

    it("should create a ticket tier successfully", async () => {
      const mockTicketTier = {
        id: "tier-1",
        ...createTicketTierDto,
        eventId: "event-1",
        soldQuantity: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockEventsService.getEventById.mockResolvedValue(mockEvent)
      mockTicketTierRepository.findOne.mockResolvedValue(null) // No existing tier
      mockTicketTierRepository.create.mockReturnValue(mockTicketTier)
      mockTicketTierRepository.save.mockResolvedValue(mockTicketTier)

      const result = await service.createTicketTier("event-1", createTicketTierDto, mockUser)

      expect(result).toBeDefined()
      expect(result.name).toBe("VIP Pass")
      expect(result.price).toBe(199.99)
      expect(mockTicketTierRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "VIP Pass",
          eventId: "event-1",
        }),
      )
    })

    it("should throw ConflictException for duplicate tier name", async () => {
      const existingTier = { id: "existing-tier", name: "VIP Pass" }

      mockEventsService.getEventById.mockResolvedValue(mockEvent)
      mockTicketTierRepository.findOne.mockResolvedValue(existingTier)

      await expect(service.createTicketTier("event-1", createTicketTierDto, mockUser)).rejects.toThrow(
        ConflictException,
      )
    })

    it("should throw ForbiddenException for unauthorized user", async () => {
      const unauthorizedUser = { ...mockUser, id: "different-user" }
      const eventWithDifferentOrganizer = {
        ...mockEvent,
        organizerId: "other-user",
      }

      mockEventsService.getEventById.mockResolvedValue(eventWithDifferentOrganizer)

      await expect(service.createTicketTier("event-1", createTicketTierDto, unauthorizedUser)).rejects.toThrow(
        ForbiddenException,
      )
    })

    it("should throw BadRequestException for invalid date range", async () => {
      const invalidDto = {
        ...createTicketTierDto,
        saleStartDate: "2025-12-31T23:59:59Z",
        saleEndDate: "2025-01-01T00:00:00Z",
      }

      mockEventsService.getEventById.mockResolvedValue(mockEvent)
      mockTicketTierRepository.findOne.mockResolvedValue(null)

      await expect(service.createTicketTier("event-1", invalidDto, mockUser)).rejects.toThrow(BadRequestException)
    })
  })

  describe("getTicketTiersByEvent", () => {
    it("should return ticket tiers for an event", async () => {
      const mockTiers = [
        {
          id: "tier-1",
          name: "VIP",
          price: 199.99,
          totalQuantity: 100,
          soldQuantity: 25,
          sortOrder: 1,
        },
        {
          id: "tier-2",
          name: "General",
          price: 99.99,
          totalQuantity: 500,
          soldQuantity: 150,
          sortOrder: 2,
        },
      ]

      mockEventsService.getEventById.mockResolvedValue({ id: "event-1" })
      mockTicketTierRepository.find.mockResolvedValue(mockTiers)

      const result = await service.getTicketTiersByEvent("event-1")

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe("VIP")
      expect(mockTicketTierRepository.find).toHaveBeenCalledWith({
        where: { eventId: "event-1" },
        order: { sortOrder: "ASC", createdAt: "ASC" },
      })
    })

    it("should throw NotFoundException for non-existent event", async () => {
      mockEventsService.getEventById.mockRejectedValue(new NotFoundException("Event not found"))

      await expect(service.getTicketTiersByEvent("non-existent")).rejects.toThrow(NotFoundException)
    })
  })

  describe("reserveTickets", () => {
    const mockTier = {
      id: "tier-1",
      totalQuantity: 100,
      soldQuantity: 25,
      isActive: true,
      saleStartDate: null,
      saleEndDate: null,
      get availableQuantity() {
        return this.totalQuantity - this.soldQuantity
      },
      get isAvailable() {
        return this.isActive && this.availableQuantity > 0
      },
    }

    it("should reserve tickets successfully", async () => {
      mockTicketTierRepository.findOne.mockResolvedValue(mockTier)
      mockTicketTierRepository.save.mockResolvedValue({
        ...mockTier,
        soldQuantity: 30,
      })

      const result = await service.reserveTickets("tier-1", 5)

      expect(result.soldQuantity).toBe(30)
      expect(mockTicketTierRepository.save).toHaveBeenCalled()
    })

    it("should throw BadRequestException for insufficient quantity", async () => {
      mockTicketTierRepository.findOne.mockResolvedValue(mockTier)

      await expect(service.reserveTickets("tier-1", 100)).rejects.toThrow(BadRequestException)
    })

    it("should throw NotFoundException for non-existent tier", async () => {
      mockTicketTierRepository.findOne.mockResolvedValue(null)

      await expect(service.reserveTickets("non-existent", 5)).rejects.toThrow(NotFoundException)
    })
  })

  describe("updateTicketTier", () => {
    const mockUser: User = {
      id: "user-1",
      role: "organizer",
    } as User

    const mockTier = {
      id: "tier-1",
      name: "VIP Pass",
      eventId: "event-1",
      totalQuantity: 100,
      soldQuantity: 25,
      event: { organizerId: "user-1" },
    }

    const updateDto: UpdateTicketTierDto = {
      name: "Premium VIP Pass",
      totalQuantity: 150,
    }

    it("should update ticket tier successfully", async () => {
      mockTicketTierRepository.findOne.mockResolvedValue(mockTier)
      mockEventsService.getEventById.mockResolvedValue({
        id: "event-1",
        organizerId: "user-1",
      })
      mockTicketTierRepository.save.mockResolvedValue({
        ...mockTier,
        ...updateDto,
      })

      const result = await service.updateTicketTier("tier-1", updateDto, mockUser)

      expect(result.name).toBe("Premium VIP Pass")
      expect(result.totalQuantity).toBe(150)
    })

    it("should throw BadRequestException when reducing quantity below sold", async () => {
      const invalidUpdate = { totalQuantity: 20 } // Less than soldQuantity (25)

      mockTicketTierRepository.findOne.mockResolvedValue(mockTier)
      mockEventsService.getEventById.mockResolvedValue({
        id: "event-1",
        organizerId: "user-1",
      })

      await expect(service.updateTicketTier("tier-1", invalidUpdate, mockUser)).rejects.toThrow(BadRequestException)
    })
  })

  describe("deleteTicketTier", () => {
    const mockUser: User = {
      id: "user-1",
      role: "organizer",
    } as User

    it("should delete ticket tier with no sold tickets", async () => {
      const mockTier = {
        id: "tier-1",
        eventId: "event-1",
        soldQuantity: 0,
        event: { organizerId: "user-1" },
        purchases: [],
      }

      mockTicketTierRepository.findOne.mockResolvedValue(mockTier)
      mockEventsService.getEventById.mockResolvedValue({
        id: "event-1",
        organizerId: "user-1",
      })
      mockTicketTierRepository.remove.mockResolvedValue(mockTier)

      await service.deleteTicketTier("tier-1", mockUser)

      expect(mockTicketTierRepository.remove).toHaveBeenCalledWith(mockTier)
    })

    it("should throw ConflictException for tier with sold tickets", async () => {
      const mockTier = {
        id: "tier-1",
        eventId: "event-1",
        soldQuantity: 10,
        event: { organizerId: "user-1" },
        purchases: [{ id: "purchase-1" }],
      }

      mockTicketTierRepository.findOne.mockResolvedValue(mockTier)
      mockEventsService.getEventById.mockResolvedValue({
        id: "event-1",
        organizerId: "user-1",
      })

      await expect(service.deleteTicketTier("tier-1", mockUser)).rejects.toThrow(ConflictException)
    })
  })

  describe("getAvailableTicketTiers", () => {
    it("should return only available ticket tiers", async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: "tier-1",
            name: "VIP",
            isActive: true,
            totalQuantity: 100,
            soldQuantity: 25,
          },
        ]),
      }

      mockTicketTierRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      const result = await service.getAvailableTicketTiers("event-1")

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("VIP")
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("tier.eventId = :eventId", { eventId: "event-1" })
    })
  })
})
