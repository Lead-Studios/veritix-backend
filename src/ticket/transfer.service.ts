import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './ticket.entity';
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

  async transferTicket(
    transferDto: TransferTicketDto,
    fromUserId: string,
  ): Promise<TicketTransfer> {
    const { ticketId, toUserId, transferPrice, transferType, reason } =
      transferDto;

    return this.ticketRepository.manager.transaction(async (em) => {
      const ticketRepo = em.getRepository(Ticket);
      const transferRepo = em.getRepository(TicketTransfer);
      const userRepo = em.getRepository(User);

      // Lock ticket row to prevent race conditions
      const ticket = await ticketRepo.findOne({
        where: { id: ticketId },
        relations: ['event', 'currentOwner', 'originalOwner'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      // Verify ownership
      if (ticket.currentOwner.id !== fromUserId) {
        throw new ForbiddenException('You can only transfer tickets you own');
      }

      // Check if ticket is transferable
      if (ticket.status !== TicketStatus.ACTIVE) {
        throw new BadRequestException('Ticket is not in a transferable state');
      }

      // Find the event and check transfer settings
      const event = await em.findOne(Event, {
        where: { id: ticket.event.id },
      });

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      // Check if transfers are allowed for this event
      if (!event.allowTransfers) {
        throw new BadRequestException(
          'Transfers are not allowed for this event',
        );
      }

      // Check transfer cooldown
      if (ticket.lastTransferDate) {
        const cooldownMs = event.transferCooldownHours * 60 * 60 * 1000;
        const timeSinceLastTransfer =
          Date.now() - ticket.lastTransferDate.getTime();

        if (timeSinceLastTransfer < cooldownMs) {
          const remainingCooldown = Math.ceil(
            (cooldownMs - timeSinceLastTransfer) / (60 * 60 * 1000),
          );
          throw new BadRequestException(
            `Transfer cooldown active. Please wait ${remainingCooldown} more hours before transferring again.`,
          );
        }
      }

      // Check maximum transfers per ticket
      if (ticket.transferCount >= event.maxTransfersPerTicket) {
        throw new BadRequestException(
          `Maximum number of transfers (${event.maxTransfersPerTicket}) reached for this ticket`,
        );
      }

      // Validate resale price cap
      const effectivePrice =
        transferPrice ?? ticket.currentPrice ?? ticket.originalPrice;
      if (transferType === TransferType.RESALE) {
        if (transferPrice === undefined) {
          throw new BadRequestException('transferPrice is required for RESALE');
        }
        if (
          event.maxResalePrice !== null &&
          event.maxResalePrice !== undefined
        ) {
          if (Number(effectivePrice) > Number(event.maxResalePrice)) {
            throw new BadRequestException(
              `Resale price cannot exceed the maximum allowed price of $${Number(event.maxResalePrice).toFixed(2)}`,
            );
          }
        }
      }

      // Find the recipient user
      const toUser = await userRepo.findOne({
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
      const transfer = transferRepo.create({
        ticket,
        fromUser: ticket.currentOwner,
        toUser,
        transferPrice: effectivePrice,
        transferType,
        reason,
      });

      // Update ticket
      ticket.currentOwner = toUser;
      ticket.lastTransferDate = new Date();
      ticket.transferCount += 1;
      ticket.currentPrice = effectivePrice;

      // Save both transfer and updated ticket within transaction
      await transferRepo.save(transfer);
      await ticketRepo.save(ticket);

      return transfer;
    });
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
      where: [{ fromUser: { id: userId } }, { toUser: { id: userId } }],
      relations: ['ticket', 'fromUser', 'toUser'],
      order: { transferDate: 'DESC' },
    });
  }

  async validateTransferEligibility(
    ticketId: string,
    userId: string,
  ): Promise<{
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
      return {
        canTransfer: false,
        reason: 'You can only transfer tickets you own',
      };
    }

    if (ticket.status !== TicketStatus.ACTIVE) {
      return {
        canTransfer: false,
        reason: 'Ticket is not in a transferable state',
      };
    }

    const event = ticket.event;
    if (!event.allowTransfers) {
      return {
        canTransfer: false,
        reason: 'Transfers are not allowed for this event',
      };
    }

    if (ticket.transferCount >= event.maxTransfersPerTicket) {
      return {
        canTransfer: false,
        reason: `Maximum transfers (${event.maxTransfersPerTicket}) reached`,
      };
    }

    if (ticket.lastTransferDate) {
      const cooldownMs = event.transferCooldownHours * 60 * 60 * 1000;
      const timeSinceLastTransfer =
        Date.now() - ticket.lastTransferDate.getTime();

      if (timeSinceLastTransfer < cooldownMs) {
        const remainingCooldown = Math.ceil(
          (cooldownMs - timeSinceLastTransfer) / (60 * 60 * 1000),
        );
        return {
          canTransfer: false,
          reason: 'Transfer cooldown active',
          cooldownRemaining: remainingCooldown,
        };
      }
    }

    return { canTransfer: true };
  }
}
