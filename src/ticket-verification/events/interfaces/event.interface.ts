interface TicketType {
  id: string
  name: string
  price: number
  available: number
}

export interface Event {
  id: string
  name: string
  description: string
  venue: string
  date: string
  capacity: number
  ticketTypes: TicketType[]
  organizer: string
  createdAt: string
  updatedAt: string
}

