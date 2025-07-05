import type { TicketStatus } from "../entities/ticket.entity"

export class TicketResponseDto {
  id: string
  ticketNumber: string
  eventId: string
  eventName: string
  purchaserName: string
  purchaserEmail: string
  qrCodeImage: string
  status: TicketStatus
  pricePaid: number
  purchaseDate: Date
  usedAt?: Date
  scannedBy?: string
}

export class ScanResultDto {
  success: boolean
  message: string
  ticket?: {
    id: string
    ticketNumber: string
    eventName: string
    purchaserName: string
    status: TicketStatus
    usedAt?: Date
  }
  error?: string
}

export class PurchaseResponseDto {
  success: boolean
  message: string
  tickets: TicketResponseDto[]
  totalAmount: number
}
