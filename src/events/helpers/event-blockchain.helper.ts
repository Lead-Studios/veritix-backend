import { Injectable, Logger } from '@nestjs/common';
import { BlockchainService } from '../../blockchain/blockchain.service';
import {
  BlockchainAnchorType,
  BlockchainAnchorRequest,
  BlockchainAnchorStatus,
} from '../../blockchain';
import { Event } from '../entities/event.entity';
import { EventBlockchainAnchorResult, EventBlockchainVerificationResult } from '../interfaces/event-blockchain.interface';

/**
 * EventBlockchainHelper
 * Handles blockchain integration for events
 * Provides abstraction between event service and blockchain service
 */
@Injectable()
export class EventBlockchainHelper {
  private readonly logger = new Logger(EventBlockchainHelper.name);

  constructor(private readonly blockchainService: BlockchainService) {}

  /**
   * Prepare event for anchoring (build anchor request)
   * Future: Will include validation, serialization, hashing
   */
  prepareEventAnchorData(event: Event): Record<string, any> {
    return {
      eventId: event.id,
      title: event.title,
      description: event.description,
      eventDate: event.eventDate.toISOString(),
      eventClosingDate: event.eventClosingDate.toISOString(),
      capacity: event.capacity,
      status: event.status,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Anchor event to blockchain
   * @param event - Event entity to anchor
   * @returns Anchor result with status
   */
  async anchorEvent(event: Event): Promise<EventBlockchainAnchorResult> {
    if (!this.blockchainService.isEnabled()) {
      this.logger.warn(
        `Blockchain disabled. Event ${event.id} anchoring would be queued for later.`,
      );
      return {
        success: false,
        eventId: event.id,
        anchorHash: null,
        transactionId: null,
        message: 'Blockchain anchoring is not enabled',
      };
    }

    try {
      const anchorData = this.prepareEventAnchorData(event);

      const anchorRequest: BlockchainAnchorRequest = {
        type: BlockchainAnchorType.EVENT,
        entityId: event.id,
        data: anchorData,
        metadata: {
          eventTitle: event.title,
          eventStatus: event.status,
        },
      };

      const anchorResult = await this.blockchainService.anchor(anchorRequest);

      return {
        success: anchorResult.success,
        eventId: event.id,
        anchorHash: anchorResult.anchorHash,
        transactionId: anchorResult.transactionId,
        message: anchorResult.message,
      };
    } catch (error) {
      this.logger.error(
        `Failed to anchor event ${event.id}:`,
        error,
      );
      return {
        success: false,
        eventId: event.id,
        anchorHash: null,
        transactionId: null,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Verify event blockchain anchor
   * @param event - Event entity with anchor hash
   * @returns Verification result
   */
  async verifyEventAnchor(event: Event): Promise<EventBlockchainVerificationResult | null> {
    if (!event.blockchainAnchorHash) {
      this.logger.warn(`Event ${event.id} has no blockchain anchor to verify`);
      return null;
    }

    if (!this.blockchainService.isEnabled()) {
      this.logger.warn(
        `Blockchain disabled. Event ${event.id} verification would be skipped.`,
      );
      return null;
    }

    try {
      const anchorData = this.prepareEventAnchorData(event);

      const verificationResult = await this.blockchainService.verify({
        anchorHash: event.blockchainAnchorHash,
        data: anchorData,
      });

      return {
        isValid: verificationResult.isValid,
        eventId: event.id,
        anchorHash: event.blockchainAnchorHash,
        message: verificationResult.message,
        verifiedAt: verificationResult.timestamp,
      };
    } catch (error) {
      this.logger.error(
        `Failed to verify event ${event.id} anchor:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get blockchain anchor status for event
   */
  getBlockchainStatus(event: Event): {
    isAnchored: boolean;
    status: BlockchainAnchorStatus | null;
    anchorHash: string | null;
    transactionId: string | null;
  } {
    return {
      isAnchored: event.blockchainAnchorHash !== null,
      status: event.blockchainStatus,
      anchorHash: event.blockchainAnchorHash,
      transactionId: event.blockchainTransactionId,
    };
  }
}
