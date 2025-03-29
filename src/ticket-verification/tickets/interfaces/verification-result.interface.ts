export interface VerificationResult {
  valid: boolean
  ticketId?: string
  event?: string
  owner?: string
  seat?: string
  resalable?: boolean
  issuedAt?: string
  error?: string
  metadata?: {
    eventId: string
    venue?: string
    date?: string
  }
}

