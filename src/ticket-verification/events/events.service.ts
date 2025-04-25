import { Injectable } from "@nestjs/common"
import type { BlockchainService } from "../blockchain/blockchain.service"
import type { CreateEventDto, UpdateEventDto } from "./dto"
import type { Event } from "./interfaces/event.interface"

@Injectable()
export class EventsService {
  // In-memory storage for demo purposes
  // In a real application, this would use a database
  private events: Event[] = [
    {
      id: "EVENT_123",
      name: "Web3 Conference 2025",
      description: "The premier conference for blockchain and web3 technologies",
      venue: "Blockchain Arena",
      date: "2025-04-15T18:00:00Z",
      capacity: 1000,
      ticketTypes: [
        { id: "GENERAL", name: "General Admission", price: 100, available: 800 },
        { id: "VIP", name: "VIP Access", price: 250, available: 200 },
      ],
      organizer: "Web3 Events Inc.",
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
    },
    {
      id: "EVENT_456",
      name: "NFT Art Exhibition",
      description: "Showcasing the best digital art on the blockchain",
      venue: "Web3 Stadium",
      date: "2025-05-20T19:30:00Z",
      capacity: 500,
      ticketTypes: [
        { id: "STANDARD", name: "Standard Entry", price: 50, available: 400 },
        { id: "PREMIUM", name: "Premium Access", price: 150, available: 100 },
      ],
      organizer: "Digital Art Collective",
      createdAt: "2024-02-01T14:30:00Z",
      updatedAt: "2024-02-01T14:30:00Z",
    },
  ]

  constructor(private readonly blockchainService: BlockchainService) {}

  async findAll(): Promise<Event[]> {
    return this.events
  }

  async findById(id: string): Promise<Event | undefined> {
    return this.events.find((event) => event.id === id)
  }

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const newEvent: Event = {
      id: `EVENT_${Date.now()}`,
      ...createEventDto,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.events.push(newEvent)
    return newEvent
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event | undefined> {
    const eventIndex = this.events.findIndex((event) => event.id === id)

    if (eventIndex === -1) {
      return undefined
    }

    const updatedEvent = {
      ...this.events[eventIndex],
      ...updateEventDto,
      ticketTypes: updateEventDto.ticketTypes?.map(ticket => ({
        id: ticket.id || `TICKET_${Date.now()}`,
        name: ticket.name,
        price: ticket.price,
        available: ticket.available
      })) || this.events[eventIndex].ticketTypes,
      updatedAt: new Date().toISOString(),
    }

    this.events[eventIndex] = updatedEvent
    return updatedEvent
  }

  async remove(id: string): Promise<boolean> {
    const eventIndex = this.events.findIndex((event) => event.id === id)

    if (eventIndex === -1) {
      return false
    }

    this.events.splice(eventIndex, 1)
    return true
  }

  async getEventTickets(eventId: string): Promise<any[]> {
    try {
      // Get tickets from blockchain
      const ticketIds = await this.blockchainService.getEventTickets(eventId)

      // Get details for each ticket
      const tickets = await Promise.all(
        ticketIds.map(async (id: string) => {
          const info = await this.blockchainService.getTicketInfo(id)
          return {
            ticketId: id,
            owner: info.owner,
            seat: info.seat,
            resalable: info.isResalable,
            issuedAt: new Date(Number(info.issuedAt) * 1000).toISOString(),
          }
        }),
      )

      return tickets
    } catch (error) {
      console.error("Error getting event tickets:", error)
      throw error
    }
  }
}

