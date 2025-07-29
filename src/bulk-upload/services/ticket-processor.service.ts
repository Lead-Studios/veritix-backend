import { Injectable } from "@nestjs/common"
import type { TicketBulkData, BulkUploadResult, BulkUploadError } from "../dto/bulk-upload.dto"

// Assuming you have these entities in your project
interface Ticket {
  id: string
  eventId: string
  ticketType: string
  price: number
  quantity: number
  description?: string
  transferable: boolean
  resellable: boolean
  maxResellPrice?: number
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class TicketProcessorService {
  constructor(
    // Inject your ticket repository here
    // @InjectRepository(Ticket)
    // private ticketRepository: Repository<Ticket>,
  ) {}

  async processTickets(ticketData: TicketBulkData[], eventId: string, uploadId: string): Promise<BulkUploadResult> {
    const errors: BulkUploadError[] = []
    let successfulRecords = 0
    let failedRecords = 0

    for (let i = 0; i < ticketData.length; i++) {
      const ticket = ticketData[i]
      const rowNumber = i + 1

      try {
        await this.validateAndCreateTicket(ticket, eventId)
        successfulRecords++
      } catch (error) {
        failedRecords++
        errors.push({
          row: rowNumber,
          message: error.message,
          data: ticket,
        })
      }
    }

    return {
      success: failedRecords === 0,
      totalRecords: ticketData.length,
      successfulRecords,
      failedRecords,
      errors,
      uploadId,
    }
  }

  private async validateAndCreateTicket(ticketData: TicketBulkData, eventId: string): Promise<void> {
    // Validate business rules
    if (ticketData.price <= 0) {
      throw new Error("Ticket price must be greater than 0")
    }

    if (ticketData.quantity <= 0) {
      throw new Error("Ticket quantity must be greater than 0")
    }

    if (ticketData.maxResellPrice && ticketData.maxResellPrice <= ticketData.price) {
      throw new Error("Max resell price must be greater than original price")
    }

    // Check if ticket type already exists for this event
    // const existingTicket = await this.ticketRepository.findOne({
    //   where: {
    //     eventId,
    //     ticketType: ticketData.ticketType,
    //   },
    // });

    // if (existingTicket) {
    //   throw new Error(`Ticket type '${ticketData.ticketType}' already exists for this event`);
    // }

    // Create the ticket
    // const ticket = this.ticketRepository.create({
    //   eventId,
    //   ticketType: ticketData.ticketType,
    //   price: ticketData.price,
    //   quantity: ticketData.quantity,
    //   description: ticketData.description,
    //   transferable: ticketData.transferable,
    //   resellable: ticketData.resellable,
    //   maxResellPrice: ticketData.maxResellPrice,
    // });

    // await this.ticketRepository.save(ticket);

    // For now, simulate the creation
    console.log(`Creating ticket: ${JSON.stringify({ eventId, ...ticketData })}`)
  }
}
