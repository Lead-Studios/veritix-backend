import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from '../user/user.entity';
import { TransferTicketDto } from './dto/transfer-ticket.dto';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async transferTicket(id: string, dto: TransferTicketDto): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['owner', 'event'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const newOwner = await this.userRepository.findOne({
      where: { id: dto.newOwnerId },
    });
    if (!newOwner) {
      throw new NotFoundException(`User with ID ${dto.newOwnerId} not found`);
    }

    if (!ticket.isTransferable) {
      throw new BadRequestException('This ticket is non-transferable');
    }

    if (ticket.transfersCount >= ticket.maxTransfers) {
      throw new BadRequestException(
        `Ticket has reached maximum transfers allowed (${ticket.maxTransfers})`,
      );
    }

    // Update ownership
    ticket.owner = newOwner;
    ticket.ownerId = dto.newOwnerId;
    ticket.transfersCount += 1;

    return await this.ticketRepository.save(ticket);
  }
}
