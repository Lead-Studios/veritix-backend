import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { TicketType } from '../entities/ticket-type.entity';
import { CreateTicketTypeDto } from '../dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from '../dto/update-ticket-type.dto';
import { TicketTypeResponseDto } from '../dto/ticket-type.response.dto';

@Injectable()
export class TicketTypeService {
  constructor(private readonly ticketTypeRepository: Repository<TicketType>) {}

  /**
   * Create a new ticket type for an event
   */
  async create(
    eventId: string,
    createTicketTypeDto: CreateTicketTypeDto,
  ): Promise<TicketTypeResponseDto> {
    // Validate sale windows
    if (
      createTicketTypeDto.saleStartsAt &&
      createTicketTypeDto.saleEndsAt &&
      new Date(createTicketTypeDto.saleStartsAt) >
        new Date(createTicketTypeDto.saleEndsAt)
    ) {
      throw new BadRequestException(
        'Sale start date must be before sale end date',
      );
    }

    const ticketType = this.ticketTypeRepository.create({
      ...createTicketTypeDto,
      eventId,
      soldQuantity: 0,
    });

    const saved = await this.ticketTypeRepository.save(ticketType);
    return this.mapToResponseDto(saved);
  }

  /**
   * Get all ticket types for an event
   */
  async findByEvent(eventId: string): Promise<TicketTypeResponseDto[]> {
    const ticketTypes = await this.ticketTypeRepository.find({
      where: { eventId },
      order: { createdAt: 'ASC' },
    });

    return ticketTypes.map((tt) => this.mapToResponseDto(tt));
  }

  /**
   * Get a specific ticket type
   */
  async findById(id: string): Promise<TicketTypeResponseDto> {
    const ticketType = await this.ticketTypeRepository.findOne({
      where: { id },
    });

    if (!ticketType) {
      throw new NotFoundException(`TicketType with ID ${id} not found`);
    }

    return this.mapToResponseDto(ticketType);
  }

  /**
   * Get a specific ticket type (internal use, returns entity)
   */
  async findByIdEntity(id: string): Promise<TicketType> {
    const ticketType = await this.ticketTypeRepository.findOne({
      where: { id },
      relations: ['event'],
    });

    if (!ticketType) {
      throw new NotFoundException(`TicketType with ID ${id} not found`);
    }

    return ticketType;
  }

  /**
   * Update a ticket type
   */
  async update(
    id: string,
    updateTicketTypeDto: UpdateTicketTypeDto,
  ): Promise<TicketTypeResponseDto> {
    const ticketType = await this.findByIdEntity(id);

    if (
      updateTicketTypeDto.saleStartsAt &&
      updateTicketTypeDto.saleEndsAt &&
      new Date(updateTicketTypeDto.saleStartsAt) >
        new Date(updateTicketTypeDto.saleEndsAt)
    ) {
      throw new BadRequestException(
        'Sale start date must be before sale end date',
      );
    }

    const updated = await this.ticketTypeRepository.save({
      ...ticketType,
      ...updateTicketTypeDto,
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Delete a ticket type (only if no tickets sold)
   */
  async delete(id: string): Promise<void> {
    const ticketType = await this.findByIdEntity(id);

    if (ticketType.soldQuantity > 0) {
      throw new BadRequestException(
        'Cannot delete ticket type with sold tickets',
      );
    }

    await this.ticketTypeRepository.remove(ticketType);
  }

  /**
   * Reserve tickets (increases soldQuantity)
   */
  async reserveTickets(
    ticketTypeId: string,
    quantity: number,
  ): Promise<TicketType> {
    const ticketType = await this.findByIdEntity(ticketTypeId);

    if (!ticketType.canPurchase(quantity)) {
      throw new BadRequestException(
        `Not enough tickets available. Remaining: ${ticketType.getRemainingQuantity()}`,
      );
    }

    // Update sold quantity atomically
    const result = await this.ticketTypeRepository.increment(
      { id: ticketTypeId },
      'soldQuantity',
      quantity,
    );

    if (result.affected === 0) {
      throw new NotFoundException(
        `TicketType with ID ${ticketTypeId} not found`,
      );
    }

    // Fetch updated entity
    return this.findByIdEntity(ticketTypeId);
  }

  /**
   * Release reserved tickets (decreases soldQuantity)
   */
  async releaseTickets(
    ticketTypeId: string,
    quantity: number,
  ): Promise<TicketType> {
    const ticketType = await this.findByIdEntity(ticketTypeId);

    if (ticketType.soldQuantity < quantity) {
      throw new BadRequestException(
        `Cannot release more tickets than sold. Sold: ${ticketType.soldQuantity}`,
      );
    }

    const result = await this.ticketTypeRepository.decrement(
      { id: ticketTypeId },
      'soldQuantity',
      quantity,
    );

    if (result.affected === 0) {
      throw new NotFoundException(
        `TicketType with ID ${ticketTypeId} not found`,
      );
    }

    return this.findByIdEntity(ticketTypeId);
  }

  /**
   * Get inventory summary for an event
   */
  async getInventorySummary(eventId: string): Promise<{
    ticketTypes: Array<{
      id: string;
      name: string;
      total: number;
      sold: number;
      remaining: number;
    }>;
    totalTickets: number;
    totalSold: number;
    totalRemaining: number;
  }> {
    const ticketTypes = await this.findByEvent(eventId);

    const summary = {
      ticketTypes: ticketTypes.map((tt) => ({
        id: tt.id,
        name: tt.name,
        total: tt.totalQuantity,
        sold: tt.soldQuantity,
        remaining: tt.remainingQuantity,
      })),
      totalTickets: 0,
      totalSold: 0,
      totalRemaining: 0,
    };

    summary.totalTickets = summary.ticketTypes.reduce(
      (sum, tt) => sum + tt.total,
      0,
    );
    summary.totalSold = summary.ticketTypes.reduce(
      (sum, tt) => sum + tt.sold,
      0,
    );
    summary.totalRemaining = summary.ticketTypes.reduce(
      (sum, tt) => sum + tt.remaining,
      0,
    );

    return summary;
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponseDto(ticketType: TicketType): TicketTypeResponseDto {
    return {
      id: ticketType.id,
      name: ticketType.name,
      description: ticketType.description,
      priceType: ticketType.priceType,
      price: Number(ticketType.price),
      totalQuantity: ticketType.totalQuantity,
      soldQuantity: ticketType.soldQuantity,
      remainingQuantity: ticketType.getRemainingQuantity(),
      maxPerPerson: ticketType.maxPerPerson,
      saleStartsAt: ticketType.saleStartsAt,
      saleEndsAt: ticketType.saleEndsAt,
      isActive: ticketType.isActive,
      isAvailableNow: ticketType.isAvailableNow(),
      eventId: ticketType.eventId,
      createdAt: ticketType.createdAt,
      updatedAt: ticketType.updatedAt,
    };
  }
}
