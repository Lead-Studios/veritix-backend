import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketType } from './entities/ticket-type.entity';

@Injectable()
export class TicketTypesService {
  constructor(
    @InjectRepository(TicketType)
    private readonly ticketTypeRepository: Repository<TicketType>,
  ) {}

  async findByEventId(eventId: string): Promise<TicketType[]> {
    return this.ticketTypeRepository.find({
      where: { eventId },
      relations: ['event'],
    });
  }

  async getTicketTypesWithAvailability(eventId: string): Promise<Array<TicketType & { remainingQuantity: number; isAvailableNow: boolean }>> {
    const ticketTypes = await this.ticketTypeRepository.find({
      where: { eventId },
      relations: ['event'],
    });

    return ticketTypes.map(ticketType => ({
      ...ticketType,
      remainingQuantity: ticketType.totalQuantity - ticketType.soldQuantity,
      isAvailableNow: ticketType.isAvailableNow,
    }));
  }

  async findOne(id: string): Promise<TicketType> {
    return this.ticketTypeRepository.findOne({
      where: { id },
      relations: ['event'],
    });
  }

  async create(ticketTypeData: Partial<TicketType>): Promise<TicketType> {
    const ticketType = this.ticketTypeRepository.create(ticketTypeData);
    return this.ticketTypeRepository.save(ticketType);
  }

  async update(id: string, ticketTypeData: Partial<TicketType>): Promise<TicketType> {
    await this.ticketTypeRepository.update(id, ticketTypeData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.ticketTypeRepository.delete(id);
  }
}
