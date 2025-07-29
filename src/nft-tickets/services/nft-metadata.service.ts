import { Injectable, Logger } from '@nestjs/common';
import { TicketingEvent } from '../../ticketing/entities/event.entity';
import { NftTicket } from '../entities/nft-ticket.entity';
import { NftMintingConfig } from '../entities/nft-minting-config.entity';

export interface NftMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  external_url?: string;
  animation_url?: string;
  background_color?: string;
  properties?: {
    files?: Array<{
      type: string;
      uri: string;
    }>;
    category?: string;
    max_value?: number;
  };
}

@Injectable()
export class NftMetadataService {
  private readonly logger = new Logger(NftMetadataService.name);

  /**
   * Generate NFT metadata for a ticket
   */
  generateTicketMetadata(
    event: TicketingEvent,
    ticket: NftTicket,
    config: NftMintingConfig,
  ): NftMetadata {
    const baseMetadata = this.getBaseMetadata(event, ticket, config);
    const customMetadata = this.parseCustomMetadata(config.customMetadata);

    return {
      ...baseMetadata,
      ...customMetadata,
      attributes: [
        ...baseMetadata.attributes,
        ...(customMetadata.attributes || []),
      ],
    };
  }

  /**
   * Generate metadata template for an event
   */
  generateMetadataTemplate(event: TicketingEvent): string {
    return JSON.stringify({
      name: `{{eventName}} - Ticket #{{tokenId}}`,
      description: `{{eventDescription}}`,
      image: `{{eventImage}}`,
      attributes: [
        {
          trait_type: 'Event',
          value: '{{eventName}}',
        },
        {
          trait_type: 'Date',
          value: '{{eventDate}}',
        },
        {
          trait_type: 'Location',
          value: '{{eventLocation}}',
        },
        {
          trait_type: 'Ticket Type',
          value: '{{ticketType}}',
        },
        {
          trait_type: 'Price',
          value: '{{pricePaid}}',
        },
      ],
      external_url: '{{eventUrl}}',
    }, null, 2);
  }

  /**
   * Parse custom metadata from JSON string
   */
  private parseCustomMetadata(customMetadata?: string): Partial<NftMetadata> {
    if (!customMetadata) {
      return {};
    }

    try {
      return JSON.parse(customMetadata);
    } catch (error) {
      this.logger.error(`Failed to parse custom metadata: ${error.message}`);
      return {};
    }
  }

  /**
   * Get base metadata for a ticket
   */
  private getBaseMetadata(
    event: TicketingEvent,
    ticket: NftTicket,
    config: NftMintingConfig,
  ): NftMetadata {
    const eventDate = event.startDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const eventTime = event.startDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      name: `${event.name} - Ticket #${ticket.tokenId || 'PENDING'}`,
      description: `${event.description || 'Event ticket'}\n\nEvent: ${event.name}\nDate: ${eventDate} at ${eventTime}\nLocation: ${event.location}\nPurchaser: ${ticket.purchaserName}`,
      image: this.generateTicketImage(event, ticket),
      attributes: [
        {
          trait_type: 'Event',
          value: event.name,
        },
        {
          trait_type: 'Date',
          value: eventDate,
        },
        {
          trait_type: 'Time',
          value: eventTime,
        },
        {
          trait_type: 'Location',
          value: event.location,
        },
        {
          trait_type: 'Ticket Type',
          value: 'NFT Ticket',
        },
        {
          trait_type: 'Platform',
          value: ticket.platform,
        },
        {
          trait_type: 'Price Paid',
          value: `${ticket.pricePaid} USD`,
        },
        {
          trait_type: 'Purchaser',
          value: ticket.purchaserName,
        },
        {
          trait_type: 'Status',
          value: ticket.status,
        },
      ],
      external_url: `${process.env.FRONTEND_URL || 'https://veritix.com'}/events/${event.id}`,
      background_color: this.getBackgroundColor(event),
    };
  }

  /**
   * Generate ticket image (placeholder or event-specific)
   */
  private generateTicketImage(event: TicketingEvent, ticket: NftTicket): string {
    // In a real implementation, you would:
    // 1. Generate a custom ticket image with event details
    // 2. Upload it to IPFS or similar
    // 3. Return the image URI

    // For now, return a placeholder
    const eventName = encodeURIComponent(event.name);
    const purchaserName = encodeURIComponent(ticket.purchaserName);
    const date = encodeURIComponent(event.startDate.toLocaleDateString());

    return `https://via.placeholder.com/400x600/1a1a1a/ffffff?text=${eventName}%0A${purchaserName}%0A${date}`;
  }

  /**
   * Get background color based on event type or theme
   */
  private getBackgroundColor(event: TicketingEvent): string {
    // You could implement logic to determine background color based on:
    // - Event type (concert, conference, sports, etc.)
    // - Event theme or branding
    // - Time of year
    // - Location

    const eventName = event.name.toLowerCase();
    
    if (eventName.includes('concert') || eventName.includes('music')) {
      return '#ff6b6b'; // Red for music events
    } else if (eventName.includes('conference') || eventName.includes('tech')) {
      return '#4ecdc4'; // Teal for tech events
    } else if (eventName.includes('sport') || eventName.includes('game')) {
      return '#45b7d1'; // Blue for sports events
    } else if (eventName.includes('art') || eventName.includes('gallery')) {
      return '#96ceb4'; // Green for art events
    } else {
      return '#f7f7f7'; // Default gray
    }
  }

  /**
   * Validate metadata structure
   */
  validateMetadata(metadata: NftMetadata): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!metadata.name) {
      errors.push('Name is required');
    }

    if (!metadata.description) {
      errors.push('Description is required');
    }

    if (!metadata.image) {
      errors.push('Image is required');
    }

    if (!metadata.attributes || !Array.isArray(metadata.attributes)) {
      errors.push('Attributes must be an array');
    }

    // Validate attributes structure
    if (metadata.attributes) {
      metadata.attributes.forEach((attr, index) => {
        if (!attr.trait_type) {
          errors.push(`Attribute ${index} missing trait_type`);
        }
        if (attr.value === undefined || attr.value === null) {
          errors.push(`Attribute ${index} missing value`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate metadata for batch minting
   */
  generateBatchMetadata(
    event: TicketingEvent,
    tickets: NftTicket[],
    config: NftMintingConfig,
  ): NftMetadata[] {
    return tickets.map(ticket => 
      this.generateTicketMetadata(event, ticket, config)
    );
  }

  /**
   * Update metadata with new information
   */
  updateMetadata(
    baseMetadata: NftMetadata,
    updates: Partial<NftMetadata>,
  ): NftMetadata {
    return {
      ...baseMetadata,
      ...updates,
      attributes: [
        ...(baseMetadata.attributes || []),
        ...(updates.attributes || []),
      ],
    };
  }
} 