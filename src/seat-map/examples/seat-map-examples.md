# Seat Map Generator API Examples

This document provides examples of how to use the Seat Map Generator API for reserved seating events.

## API Endpoints

### Seat Map Management

#### Create a Seat Map
```http
POST /seat-maps
Content-Type: application/json

{
  "name": "Main Theater",
  "description": "Theater main hall with orchestra and balcony sections",
  "venueName": "Grand Theater",
  "totalCapacity": 500,
  "layout": {
    "width": 800,
    "height": 600,
    "orientation": "landscape",
    "stage": {
      "x": 350,
      "y": 50,
      "width": 100,
      "height": 80
    }
  },
  "eventId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Get Seat Maps for an Event
```http
GET /seat-maps/event/550e8400-e29b-41d4-a716-446655440000
```

### Section Management

#### Create a Section with Auto-Generated Seats
```http
POST /seat-maps/sections
Content-Type: application/json

{
  "name": "Orchestra",
  "type": "orchestra",
  "basePrice": 75.00,
  "color": "#FF6B6B",
  "capacity": 200,
  "position": {
    "x": 100,
    "y": 200,
    "width": 600,
    "height": 300
  },
  "seatLayout": {
    "rows": 10,
    "seatsPerRow": 20,
    "aislePositions": [5, 15],
    "rowLabels": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]
  },
  "seatMapId": "seat-map-uuid-here"
}
```

#### Get Sections for a Seat Map
```http
GET /seat-maps/seat-map-uuid-here/sections?includeSeats=true&onlyAvailable=false
```

### Seat Operations

#### Get Seats by Section
```http
GET /seat-maps/sections/section-uuid-here/seats?status=available&minPrice=50&maxPrice=100
```

#### Hold a Seat (Temporary Reserve)
```http
POST /seat-maps/seats/hold
Content-Type: application/json

{
  "seatId": "seat-uuid-here",
  "holdReference": "session-12345",
  "heldUntil": "2024-12-20T15:30:00Z"
}
```

#### Assign a Seat (Permanent Purchase)
```http
POST /seat-maps/seats/assign
Content-Type: application/json

{
  "seatId": "seat-uuid-here",
  "userId": "user-uuid-here",
  "ticketId": "ticket-uuid-here",
  "assignedPrice": 75.00,
  "purchaseReference": "payment-12345"
}
```

#### Release a Held Seat
```http
POST /seat-maps/seats/release
Content-Type: application/json

{
  "seatId": "seat-uuid-here",
  "holdReference": "session-12345"
}
```

#### Transfer a Seat
```http
POST /seat-maps/seats/transfer
Content-Type: application/json

{
  "seatId": "seat-uuid-here",
  "fromUserId": "current-owner-uuid",
  "toUserId": "new-owner-uuid",
  "transferReference": "transfer-12345"
}
```

### Maintenance

#### Release Expired Holds
```http
POST /seat-maps/maintenance/release-expired-holds
```

## Common Use Cases

### 1. Setting Up a New Venue

1. Create the seat map for the event
2. Create sections (Orchestra, Balcony, etc.)
3. Seats are automatically generated based on section layout

### 2. Seat Selection Process

1. Get available seats for a section
2. Hold seats during user selection (15-minute timeout)
3. Assign seats when payment is confirmed
4. Release holds if user abandons checkout

### 3. Seat Management

1. Block/unblock seats for maintenance
2. Change seat pricing
3. Transfer seats between users
4. Handle refunds by releasing seat assignments

## Response Examples

### Seat Map Response
```json
{
  "id": "seat-map-uuid",
  "name": "Main Theater",
  "venueName": "Grand Theater",
  "totalCapacity": 500,
  "sections": [
    {
      "id": "section-uuid",
      "name": "Orchestra",
      "type": "orchestra",
      "basePrice": 75.00,
      "capacity": 200,
      "availableSeats": 180,
      "soldSeats": 15,
      "heldSeats": 5,
      "seats": [
        {
          "id": "seat-uuid",
          "row": "A",
          "number": "1",
          "label": "A-1",
          "status": "available",
          "type": "standard",
          "price": 75.00,
          "position": {
            "x": 30,
            "y": 0
          }
        }
      ]
    }
  ],
  "totalAvailableSeats": 480,
  "totalSoldSeats": 15,
  "totalHeldSeats": 5
}
```

## Error Handling

Common error responses:

- `404 Not Found` - Seat map, section, or seat not found
- `409 Conflict` - Seat already sold or held by another user
- `400 Bad Request` - Invalid hold reference or assignment data

## Best Practices

1. **Hold Management**: Always set reasonable hold timeouts (10-15 minutes)
2. **Cleanup**: Run expired hold cleanup regularly via cron job
3. **Seat Pricing**: Use section base prices with seat-specific overrides when needed
4. **Layout Design**: Plan seat layouts carefully - they're hard to change after seats are sold
5. **Concurrency**: Handle concurrent seat selections gracefully with proper error messages
