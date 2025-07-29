import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common"

// This service simulates your actual ticket inventory management.
// In a real application, this would interact with your database (e.g., your Ticket entity)
// to manage the actual available quantities.

interface SimulatedTicketInventory {
  [ticketTypeId: string]: {
    eventId: string
    totalQuantity: number
    availableQuantity: number
  }
}

@Injectable()
export class TicketInventoryService {
  private readonly logger = new Logger(TicketInventoryService.name)
  private inventory: SimulatedTicketInventory = {
    // Example initial inventory
    "f1e2d3c4-b5a6-9876-5432-10fedcba9876": {
      eventId: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      totalQuantity: 100,
      availableQuantity: 100,
    },
    "t9i8c7k6-e5t4-3210-9876-543210fedcba": {
      eventId: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      totalQuantity: 50,
      availableQuantity: 50,
    },
  }

  /**
   * Retrieves the available quantity for a specific ticket type.
   * @param ticketTypeId The ID of the ticket type.
   * @returns The available quantity.
   * @throws NotFoundException if the ticket type is not found.
   */
  getAvailableTickets(ticketTypeId: string): number {
    const item = this.inventory[ticketTypeId]
    if (!item) {
      throw new NotFoundException(`Ticket type with ID ${ticketTypeId} not found in inventory.`)
    }
    return item.availableQuantity
  }

  /**
   * Decrements the available quantity of tickets.
   * @param ticketTypeId The ID of the ticket type.
   * @param quantity The quantity to decrement.
   * @throws BadRequestException if not enough tickets are available.
   * @throws NotFoundException if the ticket type is not found.
   */
  decrementTickets(ticketTypeId: string, quantity: number): void {
    const item = this.inventory[ticketTypeId]
    if (!item) {
      throw new NotFoundException(`Ticket type with ID ${ticketTypeId} not found in inventory.`)
    }
    if (item.availableQuantity < quantity) {
      throw new BadRequestException(
        `Not enough tickets available for type ${ticketTypeId}. Requested: ${quantity}, Available: ${item.availableQuantity}`,
      )
    }
    item.availableQuantity -= quantity
    this.logger.debug(`Decremented ${quantity} tickets for ${ticketTypeId}. New available: ${item.availableQuantity}`)
  }

  /**
   * Increments the available quantity of tickets.
   * @param ticketTypeId The ID of the ticket type.
   * @param quantity The quantity to increment.
   * @throws NotFoundException if the ticket type is not found.
   */
  incrementTickets(ticketTypeId: string, quantity: number): void {
    const item = this.inventory[ticketTypeId]
    if (!item) {
      throw new NotFoundException(`Ticket type with ID ${ticketTypeId} not found in inventory.`)
    }
    item.availableQuantity += quantity
    // Ensure available quantity does not exceed total quantity
    if (item.availableQuantity > item.totalQuantity) {
      item.availableQuantity = item.totalQuantity
    }
    this.logger.debug(`Incremented ${quantity} tickets for ${ticketTypeId}. New available: ${item.availableQuantity}`)
  }

  // In a real app, you'd have methods like:
  // async getTicketTypeDetails(ticketTypeId: string): Promise<TicketTypeEntity> { ... }
  // async updateTicketQuantityInDb(ticketTypeId: string, change: number): Promise<void> { ... }
}
