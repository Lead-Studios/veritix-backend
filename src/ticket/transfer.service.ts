import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './ticket.entity';
import { TicketTransfer, TransferType } from './ticket-transfer.entity';
import { Event } from '../modules/event/event.entity';
import { User } from '../user/user.entity';
import { TransferTicketDto } from './dto/transfer-ticket.dto';

@Injectable()
export class TransferService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketTransfer)
    private transferRepository: Repository<TicketTransfer>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async transferTicket(transferDto: TransferTicketDto, fromUserId: string): Promise<TicketTransfer> {
    const { ticketId, toUserId, transferPrice, transferType, reason } = transferDto;

    // Find the ticket
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['event', 'currentOwner', 'originalOwner'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Verify ownership
    if (ticket.currentOwner.id !== fromUserId) {
      throw new ForbiddenException('You can only transfer tickets you own');
    }

    // Check if ticket is transferable
    if (ticket.status !== 'active') {
      throw new BadRequestException('Ticket is not in a transferable state');
    }

    // Find the event and check transfer settings
    const event = await this.eventRepository.findOne({
      where: { id: ticket.event.id },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if transfers are allowed for this event
    if (!event.allowTransfers) {
      throw new BadRequestException('Transfers are not allowed for this event');
    }

    // Check transfer cooldown
    if (ticket.lastTransferDate) {
      const cooldownMs = event.transferCooldownHours * 60 * 60 * 1000;
      const timeSinceLastTransfer = Date.now() - ticket.lastTransferDate.getTime();
      
      if (timeSinceLastTransfer < cooldownMs) {
        const remainingCooldown = Math.ceil((cooldownMs - timeSinceLastTransfer) / (60 * 60 * 1000));
        throw new BadRequestException(
          `Transfer cooldown active. Please wait ${remainingCooldown} more hours before transferring again.`
        );
      }
    }

    // Check maximum transfers per ticket
    if (ticket.transferCount >= event.maxTransfersPerTicket) {
      throw new BadRequestException(
        `Maximum number of transfers (${event.maxTransfersPerTicket}) reached for this ticket`
      );
    }

    // Validate resale price cap
    if (transferType === TransferType.RESALE && transferPrice) {
      if (event.maxResalePrice && transferPrice > event.maxResalePrice) {
        throw new BadRequestException(
          `Resale price cannot exceed the maximum allowed price of $${event.maxResalePrice}`
        );
      }
    }

    // Find the recipient user
    const toUser = await this.userRepository.findOne({
      where: { id: toUserId },
    });

    if (!toUser) {
      throw new NotFoundException('Recipient user not found');
    }

    // Prevent self-transfer
    if (fromUserId === toUserId) {
      throw new BadRequestException('Cannot transfer ticket to yourself');
    }

    // Create transfer record
    const transfer = this.transferRepository.create({
      ticket,
      fromUser: ticket.currentOwner,
      toUser,
      transferPrice: transferPrice || ticket.currentPrice || ticket.originalPrice,
      transferType,
      reason,
    });

    // Update ticket
    ticket.currentOwner = toUser;
    ticket.lastTransferDate = new Date();
    ticket.transferCount += 1;
    ticket.currentPrice = transferPrice || ticket.currentPrice || ticket.originalPrice;

    // Save both transfer and updated ticket
    await this.transferRepository.save(transfer);
    await this.ticketRepository.save(ticket);

    return transfer;
  }

  async getTicketTransferHistory(ticketId: string): Promise<TicketTransfer[]> {
    return this.transferRepository.find({
      where: { ticket: { id: ticketId } },
      relations: ['fromUser', 'toUser'],
      order: { transferDate: 'ASC' },
    });
  }

  async getUserTicketTransfers(userId: string): Promise<TicketTransfer[]> {
    return this.transferRepository.find({
      where: [
        { fromUser: { id: userId } },
        { toUser: { id: userId } }
      ],
      relations: ['ticket', 'fromUser', 'toUser'],
      order: { transferDate: 'DESC' },
    });
  }

  async validateTransferEligibility(ticketId: string, userId: string): Promise<{
    canTransfer: boolean;
    reason?: string;
    cooldownRemaining?: number;
  }> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['event', 'currentOwner'],
    });

    if (!ticket) {
      return { canTransfer: false, reason: 'Ticket not found' };
    }

    if (ticket.currentOwner.id !== userId) {
      return { canTransfer: false, reason: 'You can only transfer tickets you own' };
    }

    if (ticket.status !== 'active') {
      return { canTransfer: false, reason: 'Ticket is not in a transferable state' };
    }

    const event = ticket.event;
    if (!event.allowTransfers) {
      return { canTransfer: false, reason: 'Transfers are not allowed for this event' };
    }

    if (ticket.transferCount >= event.maxTransfersPerTicket) {
      return { canTransfer: false, reason: `Maximum transfers (${event.maxTransfersPerTicket}) reached` };
    }

    if (ticket.lastTransferDate) {
      const cooldownMs = event.transferCooldownHours * 60 * 60 * 1000;
      const timeSinceLastTransfer = Date.now() - ticket.lastTransferDate.getTime();
      
      if (timeSinceLastTransfer < cooldownMs) {
        const remainingCooldown = Math.ceil((cooldownMs - timeSinceLastTransfer) / (60 * 60 * 1000));
        return { 
          canTransfer: false, 
          reason: 'Transfer cooldown active',
          cooldownRemaining: remainingCooldown
        };
      }
    }

    return { canTransfer: true };
  }
}

