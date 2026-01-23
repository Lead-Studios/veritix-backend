# VeriTix Backend DTOs Documentation

This document outlines the comprehensive Data Transfer Objects (DTOs) implemented for the VeriTix backend system. All DTOs include validation decorators and are designed to meet UI requirements.

## Table of Contents

- [Events](#events)
- [Tickets](#tickets)
- [Verification](#verification)
- [Contact](#contact)

## Events

### CreateEventDto
**Purpose**: Create new events with comprehensive validation

**Key Fields**:
- `title`: Event name (1-200 chars)
- `description`: Event details (1-2000 chars)
- `eventDate`: Event date/time (ISO string)
- `eventClosingDate`: Registration close date (ISO string)
- `capacity`: Maximum attendees (1-1,000,000)
- `venue`, `address`, `city`, `countryCode`: Location information
- `imageUrl`: Event image URL
- `tags`: Array of event tags
- `isVirtual`: Virtual event flag
- `streamingUrl`: Virtual event streaming URL
- `minTicketPrice`, `maxTicketPrice`: Price range
- `currency`: 3-letter currency code

**Validation**: Comprehensive decorators for length, format, and business rules

### UpdateEventDto
**Purpose**: Update existing events (all fields optional)

**Features**: Same validation as CreateEventDto but with optional fields

### EventQueryDto
**Purpose**: Query and filter events

**Filters**:
- `search`: Text search across title/description
- `status`: Event status filter
- `city`, `countryCode`: Location filters
- `isVirtual`: Virtual event filter
- `dateFrom`, `dateTo`: Date range filter
- `minTicketPrice`, `maxTicketPrice`: Price range filter
- `tags`: Tag-based filtering
- Pagination: `page`, `limit`, `sortBy`, `sortOrder`

### EventResponseDto
**Purpose**: Standardized event response format

**Includes**: Full event details with calculated fields like `totalTicketsSold` and `availableTickets`

### ChangeEventStatusDto
**Purpose**: Update event status with audit trail

**Fields**: `status`, `reason`, `updatedBy`

## Tickets

### CreateTicketTypeDto
**Purpose**: Create ticket types for events

**Key Fields**:
- `eventId`: Associated event ID
- `name`: Ticket type name (1-100 chars)
- `description`: Ticket details (1-500 chars)
- `price`: Ticket price (0-999,999)
- `currency`: 3-letter currency code
- `quantity`: Total tickets available (1-100,000)
- `maxPerPurchase`: Max per customer (1-100)
- `saleStartDate`, `saleEndDate`: Sale window
- `tier`: Ticket tier (VIP, General, etc.)
- `benefits`: Array of included benefits
- `seatingInfo`: Seating details
- `serviceFee`: Additional service fee
- `isTransferable`: Transfer permission
- `requiresApproval`: Approval requirement

### UpdateTicketTypeDto
**Purpose**: Update existing ticket types (all fields optional)

### PurchaseTicketDto
**Purpose**: Handle ticket purchases

**Fields**:
- `ticketTypeId`: Ticket type to purchase
- `quantity`: Number of tickets (1-100)
- `promoCode`: Optional promotional code
- `attendeeNames`: Array of attendee names
- `specialRequests`: Special accommodation requests
- `paymentMethodId`: Payment method identifier
- `savePaymentMethod`: Save payment for future use

### TransferTicketDto
**Purpose**: Transfer tickets to another user

**Fields**:
- `ticketId`: Ticket to transfer
- `recipientEmail`: Recipient email
- `recipientName`: Recipient name
- `message`: Transfer message
- `scheduledTransferDate`: Scheduled transfer date

### TicketQueryDto
**Purpose**: Query and filter tickets

**Filters**:
- `eventId`: Event filter
- `status`: Ticket status filter
- `ownerId`: Owner filter
- `ticketCode`: Specific ticket code
- Pagination and sorting options

### ValidateTicketDto
**Purpose**: Validate ticket for verification

**Fields**:
- `ticketCode`: Ticket code to validate
- `eventId`: Event validation
- `verifierId`: Verifier identifier
- `markAsUsed`: Auto-mark as used flag

### TicketResponseDto
**Purpose**: Standardized ticket response format

**Includes**: Full ticket details with related entities (ticket type, event, owner)

## Verification

### VerifyTicketDto
**Purpose**: Verify tickets at events

**Fields**:
- `ticketCode`: Ticket code to verify
- `eventId`: Event validation
- `verifierId`: Verifier identifier
- `markAsUsed`: Auto-mark as used
- `deviceInfo`: Scanner device info
- `location`: Verification location
- `latitude`, `longitude`: GPS coordinates

### BulkVerifyTicketsDto
**Purpose**: Bulk verification of multiple tickets

**Features**: Array-based processing with shared verification context

### VerificationQueryDto
**Purpose**: Query verification logs and statistics

**Filters**:
- `eventId`: Event filter
- `verifierId`: Verifier filter
- `ticketCode`: Ticket code filter
- `status`: Verification status filter
- `location`: Location filter
- Date range filtering
- Pagination and sorting

### ManualVerificationDto
**Purpose**: Manual verification with reason

**Fields**:
- `ticketCode`: Ticket code
- `reason`: Manual verification reason
- `verifierId`: Verifier identifier
- `notes`: Additional notes

### VerificationResponseDto
**Purpose**: Standardized verification response

**Includes**: Verification result, ticket info, location data, audit trail

### VerificationStatsDto
**Purpose**: Verification statistics and analytics

**Metrics**:
- Total tickets, verified count, remaining count
- Verification rate percentage
- Hourly/daily trends
- Staff performance metrics

## Contact

### CreateContactDto
**Purpose**: Create contact inquiries

**Fields**:
- `name`: Contact name (1-100 chars)
- `email`: Email address with validation
- `subject`: Inquiry subject (1-200 chars)
- `message`: Message body (1-2000 chars)
- `category`: Inquiry category (General, Support, Feedback, etc.)
- `userId`, `eventId`: Associated entities
- `phoneNumber`: Contact phone number
- `companyName`, `website`: Business information
- `priority`: Inquiry priority level
- `attachmentUrls`: File attachments
- `userAgent`, `ipAddress`: Technical metadata

### UpdateContactDto
**Purpose**: Update contact inquiries

**Fields**:
- `status`: Inquiry status
- `assignedTo`: Staff assignment
- `response`: Staff response
- `category`: Category update
- `priority`: Priority level
- `internalNotes`: Internal staff notes
- `followUpDate`: Scheduled follow-up
- `tags`: Searchable tags

### ContactQueryDto
**Purpose**: Query and filter contact inquiries

**Filters**:
- `status`, `category`: Status and category filters
- `assignedTo`: Staff assignment filter
- `userId`, `eventId`: Entity association filters
- `search`: Text search
- `priority`: Priority filter
- `tags`: Tag-based filtering
- Date range filtering
- Pagination and sorting

### BulkContactUpdateDto
**Purpose**: Bulk update multiple contacts

**Features**: Array-based updates with shared field changes

### ContactResponseDto
**Purpose**: Standardized contact response

**Includes**: Full contact details with related entities and audit trail

### ContactStatsDto
**Purpose**: Contact system statistics

**Metrics**:
- Total inquiries by status and category
- Response rates and resolution rates
- Average response time
- Staff performance metrics
- Monthly trends and analytics

## Validation Features

All DTOs include comprehensive validation:

- **Length Validation**: String field length limits
- **Format Validation**: Email, URL, UUID, date formats
- **Range Validation**: Numeric min/max values
- **Enum Validation**: Restricted value sets
- **Array Validation**: Array element validation
- **Conditional Validation**: Optional vs required fields
- **Business Logic**: Custom validation rules

## Error Handling

Validation errors provide detailed feedback:
- Field-specific error messages
- Validation rule violations
- Format requirement details
- Business constraint explanations

## Usage Examples

### Creating an Event
```typescript
const eventData: CreateEventDto = {
  title: "Summer Music Festival",
  description: "Annual outdoor music celebration",
  eventDate: "2024-07-15T18:00:00Z",
  eventClosingDate: "2024-07-14T23:59:59Z",
  capacity: 5000,
  venue: "Central Park Amphitheater",
  city: "New York",
  countryCode: "US",
  imageUrl: "https://example.com/event.jpg",
  tags: ["music", "outdoor", "festival"],
  minTicketPrice: 50,
  maxTicketPrice: 200,
  currency: "USD"
};
```

### Purchasing Tickets
```typescript
const purchaseData: PurchaseTicketDto = {
  ticketTypeId: "uuid-ticket-type-id",
  quantity: 2,
  attendeeNames: ["John Doe", "Jane Doe"],
  paymentMethodId: "pm_stripe_token"
};
```

### Verifying Tickets
```typescript
const verificationData: VerifyTicketDto = {
  ticketCode: "TCK-1234567890",
  eventId: "uuid-event-id",
  verifierId: "uuid-staff-id",
  markAsUsed: true,
  deviceInfo: "Scanner App v1.2.3",
  location: "Main Entrance"
};
```

## Integration Notes

- All DTOs use `class-validator` decorators
- `class-transformer` for type transformation
- Consistent naming conventions
- Optional fields marked with `?`
- Default values provided where appropriate
- Comprehensive error messages for validation failures

This DTO structure provides a robust foundation for API contracts between frontend and backend services, ensuring data integrity and clear communication patterns.
