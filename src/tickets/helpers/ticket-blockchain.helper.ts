import { Injectable, Logger } from '@nestjs/common';
import { BlockchainService } from '../../blockchain/blockchain.service';
import {
  BlockchainAnchorType,
  BlockchainAnchorRequest,
  BlockchainAnchorStatus,
} from '../../blockchain';
import { Ticket } from '../entities/ticket.entity';
import { TicketBlockchainAnchorResult, TicketBlockchainVerificationResult } from '../interfaces/ticket-blockchain.interface';

/**
 * TicketBlockchainHelper
 * Handles blockchain integration for tickets
 * Provides abstraction between ticket service and blockchain service
 */
@Injectable()
export class TicketBlockchainHelper {
  private readonly logger = new Logger(TicketBlockchainHelper.name);

  constructor(private readonly blockchainService: BlockchainService) {}

  /**
   * Prepare ticket for anchoring (build anchor request)
   * Future: Will include validation, serialization, hashing
   */
  prepareTicketAnchorData(ticket: Ticket): Record<string, any> {
    return {
      ticketId: ticket.id,
      serialNumber: ticket.serialNumber,
      eventId: ticket.eventId,
      ownerId: ticket.ownerId,
      ticketTypeId: ticket.ticketTypeId,
      verificationStatus: ticket.verificationStatus,
      transferCount: ticket.transferCount,
      createdAt: ticket.createdAt.toISOString(),
    };
  }

  /**
   * Anchor ticket to blockchain
   * @param ticket - Ticket entity to anchor
   * @returns Anchor result with status
   */
  async anchorTicket(ticket: Ticket): Promise<TicketBlockchainAnchorResult> {
    if (!this.blockchainService.isEnabled()) {
      this.logger.warn(
        `Blockchain disabled. Ticket ${ticket.id} anchoring would be queued for later.`,
      );
      return {
        success: false,
        ticketId: ticket.id,
        anchorHash: null,
        transactionId: null,
        message: 'Blockchain anchoring is not enabled',
      };
    }

    try {
      const anchorData = this.prepareTicketAnchorData(ticket);

      const anchorRequest: BlockchainAnchorRequest = {
        type: BlockchainAnchorType.TICKET,
        entityId: ticket.id,
        data: anchorData,
        metadata: {
          serialNumber: ticket.serialNumber,
          eventId: ticket.eventId,
          ownerId: ticket.ownerId,
        },
      };

      const anchorResult = await this.blockchainService.anchor(anchorRequest);

      return {
        success: anchorResult.success,
        ticketId: ticket.id,
        anchorHash: anchorResult.anchorHash,
        transactionId: anchorResult.transactionId,
        message: anchorResult.message,
      };
    } catch (error) {
      this.logger.error(
        `Failed to anchor ticket ${ticket.id}:`,
        error,
      );
      return {
        success: false,
        ticketId: ticket.id,
        anchorHash: null,
        transactionId: null,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Anchor ticket transfer to blockchain
   * @param ticket - Ticket entity that was transferred
   * @param fromOwnerId - Previous owner ID
   * @param toOwnerId - New owner ID
   * @returns Anchor result with status
   */
  async anchorTicketTransfer(
    ticket: Ticket,
    fromOwnerId: number,
    toOwnerId: number,
  ): Promise<TicketBlockchainAnchorResult> {
    if (!this.blockchainService.isEnabled()) {
      this.logger.warn(
        `Blockchain disabled. Ticket ${ticket.id} transfer would be queued for later.`,
      );
      return {
        success: false,
        ticketId: ticket.id,
        anchorHash: null,
        transactionId: null,
        message: 'Blockchain anchoring is not enabled',
      };
    }

    try {
      const anchorData = {
        ticketId: ticket.id,
        serialNumber: ticket.serialNumber,
        eventId: ticket.eventId,
        fromOwnerId,
        toOwnerId,
        transferCount: ticket.transferCount,
        transferredAt: new Date().toISOString(),
      };

      const anchorRequest: BlockchainAnchorRequest = {
        type: BlockchainAnchorType.TICKET_TRANSFER,
        entityId: ticket.id,
        data: anchorData,
        metadata: {
          serialNumber: ticket.serialNumber,
          fromOwnerId,
          toOwnerId,
          transferCount: ticket.transferCount,
        },
      };

      const anchorResult = await this.blockchainService.anchor(anchorRequest);

      return {
        success: anchorResult.success,
        ticketId: ticket.id,
        anchorHash: anchorResult.anchorHash,
        transactionId: anchorResult.transactionId,
        message: anchorResult.message,
      };
    } catch (error) {
      this.logger.error(
        `Failed to anchor ticket transfer ${ticket.id}:`,
        error,
      );
      return {
        success: false,
        ticketId: ticket.id,
        anchorHash: null,
        transactionId: null,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Verify ticket blockchain anchor
   * @param ticket - Ticket entity with anchor hash
   * @returns Verification result
   */
  async verifyTicketAnchor(ticket: Ticket): Promise<TicketBlockchainVerificationResult | null> {
    if (!ticket.blockchainAnchorHash) {
      this.logger.warn(`Ticket ${ticket.id} has no blockchain anchor to verify`);
      return null;
    }

    if (!this.blockchainService.isEnabled()) {
      this.logger.warn(
        `Blockchain disabled. Ticket ${ticket.id} verification would be skipped.`,
      );
      return null;
    }

    try {
      const anchorData = this.prepareTicketAnchorData(ticket);

      const verificationResult = await this.blockchainService.verify({
        anchorHash: ticket.blockchainAnchorHash,
        data: anchorData,
      });

      return {
        isValid: verificationResult.isValid,
        ticketId: ticket.id,
        anchorHash: ticket.blockchainAnchorHash,
        message: verificationResult.message,
        verifiedAt: verificationResult.timestamp,
      };
    } catch (error) {
      this.logger.error(
        `Failed to verify ticket ${ticket.id} anchor:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get blockchain anchor status for ticket
   */
  getBlockchainStatus(ticket: Ticket): {
    isAnchored: boolean;
    status: BlockchainAnchorStatus | null;
    anchorHash: string | null;
    transactionId: string | null;
  } {
    return {
      isAnchored: ticket.blockchainAnchorHash !== null,
      status: ticket.blockchainStatus,
      anchorHash: ticket.blockchainAnchorHash,
      transactionId: ticket.blockchainTransactionId,
    };
  }
}
