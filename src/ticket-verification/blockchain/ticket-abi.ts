// ABI for the Ticket smart contract
export const ticketABI = [
  // Read functions
  "function getTicketInfo(string ticketId) view returns (bool isValid, address owner, string eventId, bool isResalable, string seat, uint256 issuedAt)",
  "function verifyTicket(string ticketId) view returns (bool)",
  "function ownerOf(string ticketId) view returns (address)",
  "function isResalable(string ticketId) view returns (bool)",

  // Write functions
  "function issueTicket(address to, string eventId, string seat, bool resalable) returns (string ticketId)",
  "function transferTicket(string ticketId, address newOwner) returns (bool)",
  "function setResalable(string ticketId, bool resalable) returns (bool)",

  // Events
  "event TicketIssued(string indexed ticketId, address indexed owner, string eventId)",
  "event TicketTransferred(string indexed ticketId, address indexed from, address indexed to)",
  "event TicketResalableStatusChanged(string indexed ticketId, bool resalable)",

  // Additional functions
  "function getOwnerTickets(address owner) view returns (string[] memory)",
  "function getEventTickets(string eventId) view returns (string[] memory)",
]

