import { Test, type TestingModule } from "@nestjs/testing"
import { TicketTierController } from "./ticket-tier.controller"
import type { CreateTicketTierDto } from "../dto/create-ticket-tier.dto"
import type { UpdateTicketTierDto } from "../dto/update-ticket-tier.dto"
import type { TicketTierResponseDto } from "../dto/ticket-tier-response.dto"
import type { User } from "../../users/entities/user.entity"
import { NotFoundException, ForbiddenException, ConflictException } from "@nestjs/common"
import { TicketTierService } from "../provider/ticket-tier.service"

describe("TicketTierController", () => {
  let controller: TicketTierController
  let service: TicketTierService

  const mockTicketTierService = {
    createTicketTier: jest.fn(),
    getTicketTiersByEvent: jest.fn(),
    getAvailableTicketTiers: jest.fn(),
    getTicketTierById: jest.fn(),
    updateTicketTier: jest.fn(),
    deleteTicketTier: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketTierController],
      providers: [
        {
          provide: TicketTierService,
          useValue: mockTicketTierService,
        },
      ],
    }).compile()

    controller = module.get<TicketTierController>(TicketTierController)
    service = module.get<TicketTierService>(TicketTierService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("createTicketTier", () => {
    const mockUser: User = {
      id: 1,
      role: "organizer",
      userName: "mockuser",
      email: "mockuser@example.com",
      password: "hashedpassword",
      firstName: "Mock",
      lastName: "User",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Add any other required properties with mock values as needed
    }

    const createTicketTierDto: CreateTicketTierDto = {
      name: "VIP Pass",
      description: "Premium access with backstage pass",
      price: 199.99,
      totalQuantity: 100,
      benefits: ["Backstage access", "Meet & greet"],
      isActive: true,
      sortOrder: 1,
    }

    const mockResponse: TicketTierResponseDto = {
      id: "tier-1",
      name: "VIP Pass",
      description: "Premium access with backstage pass",
      price: 199.99,
      totalQuantity: 100,
      soldQuantity: 0,
      availableQuantity: 100,
      benefits: ["Backstage access", "Meet & greet"],
      isActive: true,
      isAvailable: true,
      isSoldOut: false,
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it("should create a ticket tier successfully", async () => {
      mockTicketTierService.createTicketTier.mockResolvedValue(mockResponse)

      const result = await controller.createTicketTier("event-1", createTicketTierDto, { user: mockUser })

      expect(result).toEqual(mockResponse)
      expect(service.createTicketTier).toHaveBeenCalledWith("event-1", createTicketTierDto, mockUser)
    })

    it("should handle ConflictException for duplicate tier name", async () => {
      mockTicketTierService.createTicketTier.mockRejectedValue(
        new ConflictException('A ticket tier with the name "VIP Pass" already exists'),
      )

      await expect(controller.createTicketTier("event-1", createTicketTierDto, { user: mockUser })).rejects.toThrow(
        ConflictException,
      )
    })

    it("should handle ForbiddenException for unauthorized user", async () => {
      mockTicketTierService.createTicketTier.mockRejectedValue(
        new ForbiddenException("You do not have permission to create ticket tiers"),
      )

      await expect(controller.createTicketTier("event-1", createTicketTierDto, { user: mockUser })).rejects.toThrow(
        ForbiddenException,
      )
    })
  })

  describe("getTicketTiers", () => {
    const mockTiers: TicketTierResponseDto[] = [
      {
        id: "tier-1",
        name: "VIP",
        description: "VIP access",
        price: 199.99,
        totalQuantity: 100,
        soldQuantity: 25,
        availableQuantity: 75,
        benefits: ["Backstage access"],
        isActive: true,
        isAvailable: true,
        isSoldOut: false,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "tier-2",
        name: "General",
        description: "General admission",
        price: 99.99,
        totalQuantity: 500,
        soldQuantity: 150,
        availableQuantity: 350,
        benefits: ["Event access"],
        isActive: true,
        isAvailable: true,
        isSoldOut: false,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    it("should return all ticket tiers for an event", async () => {
      mockTicketTierService.getTicketTiersByEvent.mockResolvedValue(mockTiers)

      const result = await controller.getTicketTiers("event-1")

      expect(result).toEqual(mockTiers)
      expect(service.getTicketTiersByEvent).toHaveBeenCalledWith("event-1")
    })

    it("should return only available ticket tiers when availableOnly is true", async () => {
      const availableTiers = [mockTiers[0]]
      mockTicketTierService.getAvailableTicketTiers.mockResolvedValue(availableTiers)

      const result = await controller.getTicketTiers("event-1", true)

      expect(result).toEqual(availableTiers)
      expect(service.getAvailableTicketTiers).toHaveBeenCalledWith("event-1")
    })

    it("should handle NotFoundException for non-existent event", async () => {
      mockTicketTierService.getTicketTiersByEvent.mockRejectedValue(new NotFoundException("Event not found"))

      await expect(controller.getTicketTiers("non-existent")).rejects.toThrow(NotFoundException)
    })
  })

  describe("getTicketTier", () => {
    const mockTier: TicketTierResponseDto = {
      id: "tier-1",
      name: "VIP Pass",
      description: "Premium access",
      price: 199.99,
      totalQuantity: 100,
      soldQuantity: 25,
      availableQuantity: 75,
      benefits: ["Backstage access"],
      isActive: true,
      isAvailable: true,
      isSoldOut: false,
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it("should return a specific ticket tier", async () => {
      mockTicketTierService.getTicketTierById.mockResolvedValue(mockTier)

      const result = await controller.getTicketTier("event-1", "tier-1")

      expect(result).toEqual(mockTier)
      expect(service.getTicketTierById).toHaveBeenCalledWith("tier-1")
    })

    it("should handle NotFoundException for non-existent tier", async () => {
      mockTicketTierService.getTicketTierById.mockRejectedValue(new NotFoundException("Ticket tier not found"))

      await expect(controller.getTicketTier("event-1", "non-existent")).rejects.toThrow(NotFoundException)
    })
  })

  describe("updateTicketTier", () => {
    const mockUser: User = {
      id: 1,
      role: "organizer",
      userName: "mockuser",
      email: "mockuser@example.com",
      password: "hashedpassword",
      firstName: "Mock",
      lastName: "User",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Add any other required properties with mock values as needed
    }

    const updateTicketTierDto: UpdateTicketTierDto = {
      name: "Premium VIP Pass",
      totalQuantity: 150,
    }

    const mockUpdatedTier: TicketTierResponseDto = {
      id: "tier-1",
      name: "Premium VIP Pass",
      description: "Premium access",
      price: 199.99,
      totalQuantity: 150,
      soldQuantity: 25,
      availableQuantity: 125,
      benefits: ["Backstage access"],
      isActive: true,
      isAvailable: true,
      isSoldOut: false,
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it("should update a ticket tier successfully", async () => {
      mockTicketTierService.updateTicketTier.mockResolvedValue(mockUpdatedTier)

      const result = await controller.updateTicketTier("event-1", "tier-1", updateTicketTierDto, { user: mockUser })

      expect(result).toEqual(mockUpdatedTier)
      expect(service.updateTicketTier).toHaveBeenCalledWith("tier-1", updateTicketTierDto, mockUser)
    })

    it("should handle NotFoundException for non-existent tier", async () => {
      mockTicketTierService.updateTicketTier.mockRejectedValue(new NotFoundException("Ticket tier not found"))

      await expect(
        controller.updateTicketTier("event-1", "non-existent", updateTicketTierDto, { user: mockUser }),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe("deleteTicketTier", () => {
    const mockUser: User = {
      id: "user-1",
      role: "organizer",
      userName: "mockuser",
      email: "mockuser@example.com",
      password: "hashedpassword",
      firstName: "Mock",
      lastName: "User",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Add any other required properties with mock values as needed
    }

    it("should delete a ticket tier successfully", async () => {
      mockTicketTierService.deleteTicketTier.mockResolvedValue(undefined)

      await controller.deleteTicketTier("event-1", "tier-1", { user: mockUser })

      expect(service.deleteTicketTier).toHaveBeenCalledWith("tier-1", mockUser)
    })

    it("should handle NotFoundException for non-existent tier", async () => {
      mockTicketTierService.deleteTicketTier.mockRejectedValue(new NotFoundException("Ticket tier not found"))

      await expect(controller.deleteTicketTier("event-1", "non-existent", { user: mockUser })).rejects.toThrow(
        NotFoundException,
      )
    })

    it("should handle ConflictException for tier with sold tickets", async () => {
      mockTicketTierService.deleteTicketTier.mockRejectedValue(
        new ConflictException("Cannot delete ticket tier with sold tickets"),
      )

      await expect(controller.deleteTicketTier("event-1", "tier-1", { user: mockUser })).rejects.toThrow(
        ConflictException,
      )
    })
  })
})
