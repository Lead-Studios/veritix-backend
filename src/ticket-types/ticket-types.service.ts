import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, QueryRunner } from "typeorm";
import { TicketType } from "./entities/ticket-type.entity";

@Injectable()
export class TicketTypesService {
  constructor(
    @InjectRepository(TicketType)
    private readonly ticketTypeRepository: Repository<TicketType>,
    private readonly dataSource: DataSource,
  ) {}

  async findByEventId(eventId: string): Promise<TicketType[]> {
    return this.ticketTypeRepository.find({
      where: { eventId },
      relations: ["event"],
    });
  }

  async getTicketTypesWithAvailability(
    eventId: string,
  ): Promise<
    Array<TicketType & { remainingQuantity: number; isAvailableNow: boolean }>
  > {
    const ticketTypes = await this.ticketTypeRepository.find({
      where: { eventId },
      relations: ["event"],
    });

    return ticketTypes.map((ticketType) => ({
      ...ticketType,
      remainingQuantity: ticketType.totalQuantity - ticketType.soldQuantity,
      isAvailableNow: ticketType.isAvailableNow,
    }));
  }

  async findOne(id: string): Promise<TicketType | null> {
    return this.ticketTypeRepository.findOne({
      where: { id },
      relations: ["event"],
    });
  }

  async create(ticketTypeData: Partial<TicketType>): Promise<TicketType> {
    const ticketType = this.ticketTypeRepository.create(ticketTypeData);
    return this.ticketTypeRepository.save(ticketType);
  }

  async update(
    id: string,
    ticketTypeData: Partial<TicketType>,
  ): Promise<TicketType> {
    await this.ticketTypeRepository.update(id, ticketTypeData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.ticketTypeRepository.delete(id);
  }

  /**
   * Atomically reserve tickets with database-level locking to prevent overselling
   * @param ticketTypeId - ID of the ticket type to reserve
   * @param quantity - Number of tickets to reserve
   * @param queryRunner - Optional QueryRunner for use inside larger transactions
   * @throws BadRequestException if insufficient tickets available
   */
  async reserveTickets(
    ticketTypeId: string,
    quantity: number,
    queryRunner?: QueryRunner,
  ): Promise<TicketType> {
    if (quantity <= 0) {
      throw new BadRequestException("Quantity must be greater than 0");
    }

    const repository = queryRunner
      ? queryRunner.manager.getRepository(TicketType)
      : this.ticketTypeRepository;

    // Use SELECT ... FOR UPDATE to lock the row and prevent race conditions
    const ticketType = await repository
      .createQueryBuilder("ticketType")
      .where("ticketType.id = :id", { id: ticketTypeId })
      .setLock({ mode: 'pessimistic_write' })
      .getOne();

    if (!ticketType) {
      throw new BadRequestException(
        `Ticket type with ID ${ticketTypeId} not found`,
      );
    }

    // Check if enough tickets are available
    if (ticketType.soldQuantity + quantity > ticketType.totalQuantity) {
      throw new BadRequestException(
        `Insufficient tickets available. Requested: ${quantity}, Available: ${ticketType.totalQuantity - ticketType.soldQuantity}`,
      );
    }

    // Increment soldQuantity atomically
    ticketType.soldQuantity += quantity;
    await repository.save(ticketType);

    return ticketType;
  }

  /**
   * Atomically release reserved tickets
   * @param ticketTypeId - ID of the ticket type to release
   * @param quantity - Number of tickets to release
   * @param queryRunner - Optional QueryRunner for use inside larger transactions
   * @throws BadRequestException if trying to release more tickets than sold
   */
  async releaseTickets(
    ticketTypeId: string,
    quantity: number,
    queryRunner?: QueryRunner,
  ): Promise<TicketType> {
    if (quantity <= 0) {
      throw new BadRequestException("Quantity must be greater than 0");
    }

    const repository = queryRunner
      ? queryRunner.manager.getRepository(TicketType)
      : this.ticketTypeRepository;

    // Use SELECT ... FOR UPDATE to lock the row and prevent race conditions
    const ticketType = await repository
      .createQueryBuilder("ticketType")
      .where("ticketType.id = :id", { id: ticketTypeId })
      .setLock({ mode: 'pessimistic_write' })
      .getOne();

    if (!ticketType) {
      throw new BadRequestException(
        `Ticket type with ID ${ticketTypeId} not found`,
      );
    }

    // Guard against going below zero
    if (ticketType.soldQuantity - quantity < 0) {
      throw new BadRequestException(
        `Cannot release more tickets than sold. Requested to release: ${quantity}, Currently sold: ${ticketType.soldQuantity}`,
      );
    }

    // Decrement soldQuantity atomically
    ticketType.soldQuantity -= quantity;
    await repository.save(ticketType);

    return ticketType;
  }
}
