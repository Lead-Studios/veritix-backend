import { Injectable } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import { ethers } from "ethers"
import { ticketABI } from "./ticket-abi"

@Injectable()
export class BlockchainService {
  private provider: ethers.JsonRpcProvider
  private contract: ethers.Contract
  private wallet: ethers.Wallet

  constructor(private readonly configService: ConfigService) {
    this.initializeBlockchain()
  }

  private initializeBlockchain() {
    try {
      const providerUrl = this.configService.get<string>("BLOCKCHAIN_PROVIDER_URL")
      const contractAddress = this.configService.get<string>("TICKET_CONTRACT_ADDRESS")
      const privateKey = this.configService.get<string>("BLOCKCHAIN_PRIVATE_KEY")

      if (!providerUrl || !contractAddress) {
        console.warn("Blockchain configuration missing. Using simulation mode.")
        return
      }

      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(providerUrl)

      // Initialize contract for read operations
      this.contract = new ethers.Contract(contractAddress, ticketABI, this.provider)

      // Initialize wallet for write operations if private key is available
      if (privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider)
        this.contract = this.contract.connect(this.wallet)
      }
    } catch (error) {
      console.error("Failed to initialize blockchain connection:", error)
    }
  }

  async verifyTicket(ticketId: string): Promise<boolean> {
    if (this.contract) {
      try {
        return await this.contract.verifyTicket(ticketId)
      } catch (error) {
        console.error("Error calling verifyTicket on blockchain:", error)
        return false
      }
    }

    // Simulation mode
    return this.simulateVerifyTicket(ticketId)
  }

  async getTicketInfo(ticketId: string): Promise<any> {
    if (this.contract) {
      try {
        const [isValid, owner, eventId, isResalable, seat, issuedAt] = await this.contract.getTicketInfo(ticketId)

        return {
          isValid,
          owner,
          eventId,
          isResalable,
          seat,
          issuedAt,
        }
      } catch (error) {
        console.error("Error calling getTicketInfo on blockchain:", error)
        throw error
      }
    }

    // Simulation mode
    return this.simulateGetTicketInfo(ticketId)
  }

  async issueTicket(to: string, eventId: string, seat: string, resalable: boolean): Promise<any> {
    if (this.contract && this.wallet) {
      try {
        const tx = await this.contract.issueTicket(to, eventId, seat || "General Admission", resalable !== false)
        const receipt = await tx.wait()

        // Parse the event to get the ticket ID
        const event = receipt.logs
          .map((log: any) => {
            try {
              return this.contract.interface.parseLog(log)
            } catch (e) {
              return null
            }
          })
          .find((event: any) => event && event.name === "TicketIssued")

        if (!event) {
          throw new Error("Failed to parse TicketIssued event")
        }

        return {
          ticketId: event.args.ticketId,
          owner: event.args.owner,
          eventId: event.args.eventId,
        }
      } catch (error) {
        console.error("Error issuing ticket on blockchain:", error)
        throw error
      }
    }

    // Simulation mode
    return this.simulateIssueTicket(to, eventId, seat, resalable)
  }

  async transferTicket(ticketId: string, newOwner: string): Promise<boolean> {
    if (this.contract && this.wallet) {
      try {
        const tx = await this.contract.transferTicket(ticketId, newOwner)
        await tx.wait()
        return true
      } catch (error) {
        console.error("Error transferring ticket on blockchain:", error)
        throw error
      }
    }

    // Simulation mode
    return this.simulateTransferTicket(ticketId, newOwner)
  }

  async getOwnerTickets(owner: string): Promise<string[]> {
    if (this.contract) {
      try {
        return await this.contract.getOwnerTickets(owner)
      } catch (error) {
        console.error("Error getting owner tickets from blockchain:", error)
        throw error
      }
    }

    // Simulation mode
    return this.simulateGetOwnerTickets(owner)
  }

  async getEventTickets(eventId: string): Promise<string[]> {
    if (this.contract) {
      try {
        return await this.contract.getEventTickets(eventId)
      } catch (error) {
        console.error("Error getting event tickets from blockchain:", error)
        throw error
      }
    }

    // Simulation mode
    return this.simulateGetEventTickets(eventId)
  }

  // Simulation methods for development/testing
  private simulateVerifyTicket(ticketId: string): boolean {
    // For demo purposes, consider tickets with specific patterns as valid
    return ticketId.startsWith("0x") || ticketId.toLowerCase().includes("valid")
  }

  private simulateGetTicketInfo(ticketId: string): any {
    // Mock ticket info for simulation
    const isValid = this.simulateVerifyTicket(ticketId)

    if (!isValid) {
      return {
        isValid: false,
        owner: ethers.ZeroAddress,
        eventId: "",
        isResalable: false,
        seat: "",
        issuedAt: 0,
      }
    }

    return {
      isValid: true,
      owner: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      eventId: "EVENT_123",
      isResalable: true,
      seat: ticketId.includes("vip") ? "VIP Section A, Row 1, Seat 5" : "General Admission",
      issuedAt: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
    }
  }

  private simulateIssueTicket(to: string, eventId: string, seat: string, resalable: boolean): any {
    // Generate a mock ticket ID
    const ticketId = `TIX-${to.substring(0, 8)}-${eventId}-${Date.now()}`

    return {
      ticketId,
      owner: to,
      eventId,
    }
  }

  private simulateTransferTicket(ticketId: string, newOwner: string): boolean {
    // Check if ticket is valid
    const isValid = this.simulateVerifyTicket(ticketId)

    if (!isValid) {
      throw new Error("Ticket not found or invalid")
    }

    return true
  }

  private simulateGetOwnerTickets(owner: string): string[] {
    // Mock ticket IDs for simulation
    return [
      `0x${owner.substring(2, 10)}-ticket1`,
      `0x${owner.substring(2, 10)}-ticket2`,
      `0x${owner.substring(2, 10)}-ticket3`,
    ]
  }

  private simulateGetEventTickets(eventId: string): string[] {
    // Mock ticket IDs for simulation
    return [
      `0x${eventId}-ticket1`,
      `0x${eventId}-ticket2`,
      `0x${eventId}-ticket3`,
      `0x${eventId}-ticket4`,
      `0x${eventId}-ticket5`,
    ]
  }
}

