export interface Ticket {
  ticketId: string
  owner?: string
  event: string
  seat?: string
  resalable: boolean
  issuedAt: string
  metadata?: {
    eventId: string
    venue?: string
    date?: string
  }
}

