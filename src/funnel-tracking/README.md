# Funnel Tracking System

A comprehensive funnel tracking system for monitoring user journeys from event view to ticket purchase completion.

## Features

### 🎯 Funnel Stages
- **Event View**: User views event page
- **Ticket Selection**: User selects ticket tier/type
- **Cart Add**: User adds tickets to cart
- **Checkout Start**: User begins checkout process
- **Payment Info**: User enters payment information
- **Payment Complete**: Payment is processed successfully
- **Purchase Complete**: Full purchase flow completed

### 📊 Tracking Capabilities
- **Session Management**: Track user sessions across funnel stages
- **Action Tracking**: Log individual user actions with metadata
- **Traffic Source Analysis**: Track UTM parameters and referrer sources
- **Device & Browser Detection**: Capture device type, browser, and OS
- **Geographic Tracking**: Track user location (country/city)
- **Time Analysis**: Measure time spent at each funnel stage
- **Error Tracking**: Capture and log funnel errors

### 📈 Analytics & Reporting
- **Real-time Statistics**: Live funnel conversion rates
- **Drop-off Analysis**: Identify where users abandon the funnel
- **Revenue Tracking**: Monitor revenue per funnel stage
- **Traffic Source Breakdown**: Analyze performance by traffic source
- **Device Performance**: Compare conversion rates across devices
- **Geographic Insights**: Regional performance analysis

## Database Schema

### FunnelAction Entity
Tracks individual user actions within the funnel:
```typescript
{
  id: string;
  sessionId: string;
  eventId: string;
  userId?: string;
  stage: FunnelStage;
  actionType: FunnelActionType;
  actionName?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  trafficSource?: string;
  timeOnPage?: number;
  errorMessage?: string;
  createdAt: Date;
}
```

### FunnelSession Entity
Manages user sessions throughout the funnel journey:
```typescript
{
  id: string;
  eventId: string;
  userId?: string;
  status: FunnelSessionStatus;
  totalActions: number;
  totalTimeSpent: number;
  purchaseId?: string;
  totalSpent?: number;
  completedAt?: Date;
  abandonedAt?: Date;
  createdAt: Date;
}
```

### FunnelStats Entity
Aggregated daily statistics for quick access:
```typescript
{
  id: string;
  eventId: string;
  stage: FunnelStage;
  date: Date;
  totalSessions: number;
  totalActions: number;
  uniqueUsers: number;
  conversions: number;
  conversionRate: number;
  dropoffRate: number;
  avgTimeSpent: number;
  totalRevenue: number;
  trafficSourceBreakdown: Record<string, number>;
  deviceBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
}
```

## API Endpoints

### Session Management
```http
POST /funnel-tracking/session/start
POST /funnel-tracking/session/:sessionId/complete
POST /funnel-tracking/session/:sessionId/abandon
```

### Action Tracking
```http
POST /funnel-tracking/track
POST /funnel-tracking/track/event-view
POST /funnel-tracking/track/ticket-selection
POST /funnel-tracking/track/cart-add
POST /funnel-tracking/track/checkout-start
POST /funnel-tracking/track/payment-complete
```

### Analytics
```http
GET /funnel-tracking/stats/:eventId
```

## Usage Examples

### 1. Start a Funnel Session
```javascript
// Frontend: Start session when user visits event page
const response = await fetch('/funnel-tracking/session/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventId: 'event-123',
    userId: 'user-456' // optional
  })
});

const { sessionId } = await response.json();
```

### 2. Track Event View
```javascript
// Frontend: Track when user views event page
await fetch('/funnel-tracking/track/event-view', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventId: 'event-123',
    sessionId: sessionId,
    userId: 'user-456'
  })
});
```

### 3. Track Ticket Selection
```javascript
// Frontend: Track when user selects a ticket tier
await fetch('/funnel-tracking/track/ticket-selection', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventId: 'event-123',
    sessionId: sessionId,
    userId: 'user-456',
    ticketTier: 'VIP',
    price: 150.00
  })
});
```

### 4. Track Purchase Completion
```javascript
// Backend: Track when purchase is completed
await fetch('/funnel-tracking/track/payment-complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventId: 'event-123',
    sessionId: sessionId,
    userId: 'user-456',
    purchaseId: 'purchase-789',
    totalSpent: 150.00
  })
});
```

### 5. Get Funnel Statistics
```javascript
// Get funnel stats for an event
const stats = await fetch('/funnel-tracking/stats/event-123?startDate=2024-01-01&endDate=2024-01-31');
const funnelData = await stats.json();

console.log('Conversion Rate:', funnelData.overallConversionRate);
console.log('Total Revenue:', funnelData.totalRevenue);
console.log('Stage Breakdown:', funnelData.stages);
```

## Middleware Integration

The system includes automatic middleware that tracks funnel actions based on HTTP requests:

```typescript
// Automatically tracks funnel actions based on URL patterns
// GET /events/:eventId -> EVENT_VIEW stage
// GET /tickets/:eventId -> TICKET_SELECTION stage
// POST /tickets/purchase -> CHECKOUT_START stage
// POST /payment/complete -> PAYMENT_COMPLETE stage
```

## Integration with Existing Systems

### Ticket Purchase Flow
The funnel tracking system integrates with existing ticket purchase flows:

1. **Event View**: Tracked when user visits event page
2. **Ticket Selection**: Tracked when user selects ticket tier
3. **Cart Addition**: Tracked when tickets added to cart
4. **Checkout Start**: Tracked when user begins checkout
5. **Payment Complete**: Tracked when payment is successful

### Analytics Integration
The system works alongside existing analytics modules:
- Compatible with `AnalyticsModule`
- Integrates with `EventAnalyticsModule`
- Extends existing tracking capabilities

## Configuration

### Environment Variables
```env
# Database configuration (inherited from main app)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=veritix_backend
```

### Module Registration
```typescript
// app.module.ts
import { FunnelTrackingModule } from './funnel-tracking/funnel-tracking.module';

@Module({
  imports: [
    // ... other modules
    FunnelTrackingModule,
  ],
})
export class AppModule {}
```

## Performance Considerations

### Database Optimization
- Indexed queries for fast funnel statistics
- Partitioned tables for large datasets
- Aggregated daily statistics for quick access

### Caching Strategy
- Session data cached in memory
- Daily stats cached for 24 hours
- Real-time aggregation for live dashboards

### Scalability
- Horizontal scaling with session distribution
- Async processing for non-critical tracking
- Batch processing for analytics aggregation

## Monitoring & Alerts

### Key Metrics to Monitor
- **Conversion Rate**: Overall funnel completion rate
- **Drop-off Points**: Stages with highest abandonment
- **Revenue Impact**: Revenue lost at each stage
- **Traffic Source Performance**: Conversion by traffic source
- **Error Rates**: Failed actions and their causes

### Alert Thresholds
- Conversion rate drops below 2%
- Error rate exceeds 5%
- Revenue drop of more than 20%
- Session abandonment rate above 80%

## Future Enhancements

### Planned Features
- **A/B Testing Integration**: Track funnel performance across variants
- **Predictive Analytics**: Predict user likelihood to convert
- **Personalization**: Customize funnel based on user behavior
- **Mobile App Tracking**: Native mobile app integration
- **Real-time Dashboards**: Live funnel visualization

### Advanced Analytics
- **Cohort Analysis**: Track user cohorts through funnel
- **Attribution Modeling**: Multi-touch attribution analysis
- **Predictive Modeling**: ML-based conversion prediction
- **Behavioral Segmentation**: User behavior clustering

## Contributing

### Development Setup
1. Install dependencies: `npm install`
2. Set up database: Configure PostgreSQL connection
3. Run migrations: `npm run migration:run`
4. Start development server: `npm run start:dev`

### Testing
```bash
# Unit tests
npm run test src/funnel-tracking

# Integration tests
npm run test:e2e

# Coverage
npm run test:cov
```

### Code Style
- Follow NestJS conventions
- Use TypeScript strict mode
- Implement proper error handling
- Add comprehensive documentation

## License

This funnel tracking system is part of the Veritix Backend project and follows the same licensing terms. 