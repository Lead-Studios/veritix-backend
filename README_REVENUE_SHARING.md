# Revenue Sharing Module

## Overview
The Revenue Sharing Module enables smart contract-like revenue splitting between stakeholders in the Veritix platform. This module allows event organizers to define how revenue from ticket sales is distributed among different parties.

## Features
1. **Flexible Revenue Splitting**: Define percentage-based or fixed-amount revenue splits
2. **Automatic Distribution**: Revenue is automatically distributed after ticket sales
3. **Dashboard Integration**: View revenue breakdowns in the dashboard
4. **Stakeholder Management**: Associate multiple stakeholders with revenue shares

## Module Structure
```
src/modules/revenue-sharing/
├── revenue-sharing.entity.ts      # RevenueShareRule entity definition
├── revenue-sharing.service.ts     # Business logic for revenue distribution
├── revenue-sharing.controller.ts  # API endpoints for revenue management
├── revenue-sharing.module.ts      # Module definition
├── dto/
│   └── create-revenue-split.dto.ts # DTO for defining revenue splits
└── revenue-sharing.service.spec.ts # Unit tests
```

## Entity: RevenueShareRule
The [RevenueShareRule](file:///c:/Users/k-aliyu/Documents/GitHub/veritix-backend/src/modules/revenue-sharing/revenue-sharing.entity.ts#L16-L38) entity defines how revenue should be split for an event:

- `event`: The event associated with this revenue split
- `stakeholder`: The user who will receive a portion of the revenue
- `shareType`: Either PERCENTAGE or FIXED_AMOUNT
- `shareValue`: The percentage (0-100) or fixed amount to distribute
- `isActive`: Whether this rule is currently active

## API Endpoints

### Define Revenue Split
```
POST /revenue-sharing/events/:eventId/splits
```
Define how revenue should be split for an event.

**Request Body:**
```json
{
  "splits": [
    {
      "stakeholderId": "user1",
      "shareType": "percentage",
      "shareValue": 70
    },
    {
      "stakeholderId": "user2",
      "shareType": "percentage",
      "shareValue": 30
    }
  ]
}
```

### Distribute Revenue
```
POST /revenue-sharing/events/:eventId/distribute
```
Trigger revenue distribution for an event based on defined rules.

**Request Body:**
```json
{
  "totalRevenue": 10000
}
```

### Get Revenue Breakdown
```
GET /revenue-sharing/events/:eventId/breakdown
```
Retrieve revenue breakdown for dashboard display.

## Integration with Ticket Sales
The revenue sharing module integrates with the ticket sales process:

1. When tickets are sold, the total revenue is calculated
2. The system automatically calls the distribute revenue function
3. Revenue is split according to the defined rules
4. Each stakeholder receives their portion

## Example Usage

### 1. Define a 70/30 Revenue Split
An event organizer wants to split revenue 70% to themselves and 30% to a venue partner:

```typescript
const splits = [
  {
    stakeholderId: "organizer-user-id",
    shareType: RevenueShareType.PERCENTAGE,
    shareValue: 70
  },
  {
    stakeholderId: "venue-partner-id",
    shareType: RevenueShareType.PERCENTAGE,
    shareValue: 30
  }
];

await revenueSharingService.defineRevenueSplit("event-id", splits);
```

### 2. Distribute Revenue After Sales
After an event generates $10,000 in ticket sales:

```typescript
const breakdown = await revenueSharingService.distributeRevenue("event-id", 10000);
// Organizer receives $7,000
// Venue partner receives $3,000
```

## Future Enhancements
1. **Smart Contract Integration**: Integrate with blockchain smart contracts for automated execution
2. **Escrow Services**: Hold funds in escrow until event completion
3. **Dispute Resolution**: Handle revenue disputes between stakeholders
4. **Audit Trail**: Detailed logging of all revenue distribution activities
5. **Multiple Distribution Models**: Support for more complex distribution scenarios

## Testing
The module includes comprehensive unit tests to ensure correct revenue calculation and distribution logic.

To run tests:
```bash
npm run test revenue-sharing
```