import { Injectable, HttpException, HttpStatus } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { Ticket } from "../../tickets/entities/ticket.entity"

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
  ) {}

  // Existing methods...

  async findOne(id: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: ["event", "user"],
    })

    if (!ticket) {
      throw new HttpException("Ticket not found", HttpStatus.NOT_FOUND)
    }

    return ticket
  }

  async updateOwner(id: string, newOwnerId: string): Promise<Ticket> {
    const ticket = await this.findOne(id)

    // Update the owner
    ticket.userId = newOwnerId

    // Save the updated ticket
    return this.ticketsRepository.save(ticket)
  }
}

