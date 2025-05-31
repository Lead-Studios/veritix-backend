import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository, QueryRunner } from "typeorm"
import { TicketTier } from "../entities/ticket-tier.entity"
import { Event } from "../../events/entities/event.entity"
import { User } from "../../users/entities/user.entity"
import { CreateTicketTierDto } from "../dto/create-ticket-tier.dto"
import { UpdateTicketTierDto } from "../dto/update-ticket-tier.dto"
import { TicketTierResponseDto } from "../dto/ticket-tier-response.dto"
import { plainToClass } from "class-transformer"
import { EventsService } from "../../events/events.service"
import { UserRole } from "src/common/enums/users-roles.enum"

@Injectable()
export class TicketTierService {
  constructor(
    @InjectRepository(TicketTier)
    private readonly ticketTierRepository: Repository<TicketTier>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Create a new ticket tier for an event
   */
  async createTicketTier(
    eventId: string,
    createTicketTierDto: CreateTicketTierDto,
    user: User,
  ): Promise<TicketTierResponseDto> {
    // Validate event exists and user has permission
    const event = await this.validateEventOwnership(eventId, user)

    // Validate business rules
    await this.validateTicketTierCreation(eventId, createTicketTierDto)

    // Create the ticket tier
    const ticketTier = this.ticketTierRepository.create({
      ...createTicketTierDto,
      eventId: event.id,
      saleStartDate: createTicketTierDto.saleStartDate ? new Date(createTicketTierDto.saleStartDate) : null,
      saleEndDate: createTicketTierDto.saleEndDate ? new Date(createTicketTierDto.saleEndDate) : null,
    })

    const savedTier = await this.ticketTierRepository.save(ticketTier)
    return plainToClass(TicketTierResponseDto, savedTier, { excludeExtraneousValues: true })
  }

  /**
   * Get all ticket tiers for an event
   */
  async getTicketTiersByEvent(eventId: string): Promise<TicketTierResponseDto[]> {
    // Validate event exists
    await this.eventsService.getEventById(eventId)

    const tiers = await this.ticketTierRepository.find({
      where: { eventId },
      order: { sortOrder: "ASC", createdAt: "ASC" },
    })

    return tiers.map((tier) => plainToClass(TicketTierResponseDto, tier, { excludeExtraneousValues: true }))
  }

  /**
   * Get a specific ticket tier by ID
   */
  async getTicketTierById(tierId: string): Promise<TicketTierResponseDto> {
    const tier = await this.ticketTierRepository.findOne({
      where: { id: tierId },
      relations: ["event"],
    })

    if (!tier) {
      throw new NotFoundException("Ticket tier not found")
    }

    return plainToClass(TicketTierResponseDto, tier, { excludeExtraneousValues: true })
  }

  /**
   * Update a ticket tier
   */
  async updateTicketTier(
    tierId: string,
    updateTicketTierDto: UpdateTicketTierDto,
    user: User,
  ): Promise<TicketTierResponseDto> {
    const tier = await this.ticketTierRepository.findOne({
      where: { id: tierId },
      relations: ["event"],
    })

    if (!tier) {
      throw new NotFoundException("Ticket tier not found")
    }

    // Validate user has permission to update this tier
    await this.validateEventOwnership(tier.eventId, user)

    // Validate update constraints
    await this.validateTicketTierUpdate(tier, updateTicketTierDto)

    // Apply updates
    Object.assign(tier, {
      ...updateTicketTierDto,
      saleStartDate: updateTicketTierDto.saleStartDate
        ? new Date(updateTicketTierDto.saleStartDate)
        : tier.saleStartDate,
      saleEndDate: updateTicketTierDto.saleEndDate ? new Date(updateTicketTierDto.saleEndDate) : tier.saleEndDate,
    })

    const updatedTier = await this.ticketTierRepository.save(tier)
    return plainToClass(TicketTierResponseDto, updatedTier, { excludeExtraneousValues: true })
  }

  /**
   * Delete a ticket tier
   */
  async deleteTicketTier(tierId: string, user: User): Promise<void> {
    const tier = await this.ticketTierRepository.findOne({
      where: { id: tierId },
      relations: ["event", "purchases"],
    })

    if (!tier) {
      throw new NotFoundException("Ticket tier not found")
    }

    // Validate user has permission
    await this.validateEventOwnership(tier.eventId, user)

    // Prevent deletion if tickets have been sold
    if (tier.soldQuantity > 0) {
      throw new ConflictException("Cannot delete ticket tier with sold tickets. Consider deactivating instead.")
    }

    await this.ticketTierRepository.remove(tier)
  }

  /**
   * Reserve tickets from a tier (used during purchase process)
   */
  async reserveTickets(tierId: string, quantity: number, queryRunner?: QueryRunner): Promise<TicketTier> {
    const repository = queryRunner ? queryRunner.manager.getRepository(TicketTier) : this.ticketTierRepository

    const tier = await repository.findOne({
      where: { id: tierId },
      lock: { mode: "pessimistic_write" },
    })

    if (!tier) {
      throw new NotFoundException("Ticket tier not found")
    }

    if (!tier.isAvailable) {
      throw new BadRequestException("Ticket tier is not available for purchase")
    }

    if (tier.availableQuantity < quantity) {
      throw new BadRequestException(`Only ${tier.availableQuantity} tickets available in this tier`)
    }

    tier.soldQuantity += quantity
    return await repository.save(tier)
  }

  /**
   * Release reserved tickets (used when purchase fails)
   */
  async releaseTickets(tierId: string, quantity: number, queryRunner?: QueryRunner): Promise<void> {
    const repository = queryRunner ? queryRunner.manager.getRepository(TicketTier) : this.ticketTierRepository

    const tier = await repository.findOne({
      where: { id: tierId },
      lock: { mode: "pessimistic_write" },
    })

    if (tier) {
      tier.soldQuantity = Math.max(0, tier.soldQuantity - quantity)
      await repository.save(tier)
    }
  }

  /**
   * Get available ticket tiers for purchase
   */
  async getAvailableTicketTiers(eventId: string): Promise<TicketTierResponseDto[]> {
    const tiers = await this.ticketTierRepository
      .createQueryBuilder("tier")
      .where("tier.eventId = :eventId", { eventId })
      .andWhere("tier.isActive = true")
      .andWhere("tier.totalQuantity > tier.soldQuantity")
      .andWhere("(tier.saleStartDate IS NULL OR tier.saleStartDate <= :now)", { now: new Date() })
      .andWhere("(tier.saleEndDate IS NULL OR tier.saleEndDate >= :now)", { now: new Date() })
      .orderBy("tier.sortOrder", "ASC")
      .addOrderBy("tier.price", "ASC")
      .getMany()

    return tiers.map((tier) => plainToClass(TicketTierResponseDto, tier, { excludeExtraneousValues: true }))
  }

  /**
   * Validate event ownership
   */
  private async validateEventOwnership(eventId: string, user: User): Promise<Event> {
    const event = await this.eventsService.getEventById(eventId)

    // Note: This assumes there's an organizerId field on the event
    // You may need to adjust this based on your actual event-user relationship
    // Replace 'UserRole.ADMIN' with the actual enum or constant used in your project
    if (user.role !== UserRole.Admin && event["organizerId"] !== user.id) {
      throw new ForbiddenException("You do not have permission to manage ticket tiers for this event")
    }

    return event
  }

  /**
   * Validate ticket tier creation business rules
   */
  private async validateTicketTierCreation(eventId: string, createTicketTierDto: CreateTicketTierDto): Promise<void> {
    // Check for duplicate tier names within the same event
    const existingTier = await this.ticketTierRepository.findOne({
      where: {
        eventId,
        name: createTicketTierDto.name,
      },
    })

    if (existingTier) {
      throw new ConflictException(
        `A ticket tier with the name "${createTicketTierDto.name}" already exists for this event`,
      )
    }

    // Validate date constraints
    if (createTicketTierDto.saleStartDate && createTicketTierDto.saleEndDate) {
      const startDate = new Date(createTicketTierDto.saleStartDate)
      const endDate = new Date(createTicketTierDto.saleEndDate)

      if (startDate >= endDate) {
        throw new BadRequestException("Sale start date must be before sale end date")
      }
    }

    // Validate sort order uniqueness (optional - you might allow duplicates)
    if (createTicketTierDto.sortOrder !== undefined) {
      const existingSortOrder = await this.ticketTierRepository.findOne({
        where: {
          eventId,
          sortOrder: createTicketTierDto.sortOrder,
        },
      })

      if (existingSortOrder) {
        throw new ConflictException(`Sort order ${createTicketTierDto.sortOrder} is already used by another tier`)
      }
    }
  }

  /**
   * Validate ticket tier update constraints
   */
  private async validateTicketTierUpdate(tier: TicketTier, updateDto: UpdateTicketTierDto): Promise<void> {
    // Prevent reducing total quantity below sold quantity
    if (updateDto.totalQuantity !== undefined && updateDto.totalQuantity < tier.soldQuantity) {
      throw new BadRequestException(`Cannot reduce total quantity below sold quantity (${tier.soldQuantity})`)
    }

    // Validate date constraints
    if (updateDto.saleStartDate && updateDto.saleEndDate) {
      const startDate = new Date(updateDto.saleStartDate)
      const endDate = new Date(updateDto.saleEndDate)

      if (startDate >= endDate) {
        throw new BadRequestException("Sale start date must be before sale end date")
      }
    }

    // Check for name conflicts (if name is being updated)
    if (updateDto.name && updateDto.name !== tier.name) {
      const existingTier = await this.ticketTierRepository.findOne({
        where: {
          eventId: tier.eventId,
          name: updateDto.name,
        },
      })

      if (existingTier) {
        throw new ConflictException(`A ticket tier with the name "${updateDto.name}" already exists for this event`)
      }
    }
  }
}
