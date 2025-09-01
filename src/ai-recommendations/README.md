# AI-Powered Event Recommendations System

A comprehensive machine learning-powered recommendation system for Veritix that provides personalized event recommendations using collaborative filtering, content-based filtering, and hybrid approaches with real-time API, A/B testing, and analytics.

## Features

### Core Recommendation Algorithms
- **Collaborative Filtering**: Recommendations based on user similarity and interaction patterns
- **Content-Based Filtering**: Recommendations using event metadata and user preferences
- **Hybrid Model**: Combines collaborative and content-based approaches using TensorFlow.js
- **Location-Based**: Geographic proximity recommendations
- **Trending Events**: Popular and trending event recommendations

### Machine Learning Pipeline
- **TensorFlow.js Integration**: On-premise ML model training and inference
- **Real-time Model Training**: Continuous learning from user interactions
- **Model Versioning**: Track and manage different model versions
- **Performance Monitoring**: Comprehensive model performance analytics

### User Behavior Tracking
- **Interaction Tracking**: View, click, share, save, purchase, like, comment tracking
- **Preference Learning**: Automatic preference extraction from user behavior
- **Device Fingerprinting**: Track user behavior across devices
- **Context Awareness**: Location, time, and session context tracking

### A/B Testing Framework
- **Experiment Management**: Create, start, stop, and analyze experiments
- **Traffic Allocation**: Configurable traffic splitting between variants
- **Statistical Significance**: Automated significance testing
- **Performance Comparison**: Compare algorithm performance metrics

### Real-time API
- **Personalized Recommendations**: Homepage, similar events, category-based
- **Filtering & Sorting**: Price, date, location, category filters
- **Explanation System**: Detailed reasons for recommendations
- **Performance Tracking**: Real-time analytics and monitoring

## Architecture

### Entities
- `UserPreference`: Store user preference types, values, and weights
- `UserInteraction`: Track all user interactions with events
- `RecommendationModel`: ML model metadata and performance metrics
- `Recommendation`: Generated recommendations with scores and explanations
- `RecommendationAnalytics`: Performance metrics and analytics data
- `AbTestExperiment`: A/B testing experiment configuration and results

### Services
- `UserBehaviorTrackingService`: Track interactions and update preferences
- `CollaborativeFilteringService`: User similarity-based recommendations
- `ContentBasedFilteringService`: Event metadata-based recommendations
- `MLTrainingService`: TensorFlow.js model training and management
- `RecommendationEngineService`: Main orchestration service
- `ABTestingService`: A/B testing experiment management
- `RecommendationExplanationService`: Generate recommendation explanations
- `RecommendationAnalyticsService`: Performance analytics and reporting

### Controllers
- `RecommendationsController`: Public API for getting recommendations
- `RecommendationsAdminController`: Admin API for system management

## API Endpoints

### Public Recommendations API

#### Get Recommendations
```http
GET /recommendations?type=homepage&limit=10&includeExplanation=true
```

**Parameters:**
- `type`: homepage, similar, category, trending, location, personalized
- `limit`: Number of recommendations (1-50, default: 10)
- `offset`: Pagination offset (default: 0)
- `eventId`: For similar recommendations
- `category`: For category-based recommendations
- `latitude/longitude`: For location-based recommendations
- `maxDistance`: Maximum distance in km (default: 50)
- `minPrice/maxPrice`: Price range filters
- `startDate/endDate`: Date range filters
- `categories`: Include specific categories
- `excludeCategories`: Exclude specific categories
- `sortBy`: relevance, date, popularity, price, distance
- `includeExplanation`: Include recommendation explanations
- `includeDiversity`: Include diversity in recommendations
- `experimentId`: A/B test experiment ID

**Response:**
```json
{
  "recommendations": [
    {
      "id": "rec_123",
      "eventId": "event_456",
      "event": {
        "id": "event_456",
        "name": "Tech Conference 2024",
        "description": "Annual technology conference",
        "location": "San Francisco, CA",
        "startDate": "2024-03-15T09:00:00Z",
        "endDate": "2024-03-15T18:00:00Z",
        "category": "Technology",
        "imageUrl": "https://example.com/image.jpg",
        "price": 299,
        "availableTickets": 150
      },
      "score": 0.85,
      "confidence": 0.92,
      "explanation": "This event matches your technology interests",
      "reasons": ["category_match", "location_preference"],
      "status": "active",
      "algorithm": "hybrid",
      "abTestGroup": "variant_a",
      "createdAt": "2024-03-01T10:00:00Z"
    }
  ],
  "total": 25,
  "offset": 0,
  "limit": 10,
  "hasMore": true,
  "experiment": {
    "id": "exp_123",
    "name": "Recommendation Algorithm Test",
    "variant": "variant_a"
  },
  "metadata": {
    "algorithm": "hybrid",
    "modelVersion": "v1.2.0",
    "processingTime": 45,
    "diversityScore": 0.78
  }
}
```

#### Track Interaction
```http
POST /recommendations/interaction
```

**Body:**
```json
{
  "eventId": "event_456",
  "interactionType": "click",
  "recommendationId": "rec_123",
  "context": {
    "source": "homepage",
    "position": 2
  },
  "deviceInfo": {
    "userAgent": "Mozilla/5.0...",
    "platform": "web"
  }
}
```

#### Get User Preferences
```http
GET /recommendations/preferences
```

#### Update User Preferences
```http
PUT /recommendations/preferences
```

**Body:**
```json
{
  "categories": ["Technology", "Music"],
  "locations": ["San Francisco", "New York"],
  "minPrice": 50,
  "maxPrice": 500,
  "eventTimes": ["18:00-22:00", "10:00-14:00"],
  "metadata": {
    "preferredVenues": ["Convention Center"],
    "interests": ["AI", "Startups"]
  }
}
```

#### Get Recommendation Statistics
```http
GET /recommendations/stats
```

#### Get Similar Events
```http
GET /recommendations/similar/{eventId}?limit=10&includeExplanation=true
```

#### Get Trending Events
```http
GET /recommendations/trending?limit=10&location=San Francisco&category=Technology
```

#### Get Category Recommendations
```http
GET /recommendations/category/{category}?limit=10&includeExplanation=true
```

#### Get Location-Based Recommendations
```http
GET /recommendations/location?latitude=37.7749&longitude=-122.4194&maxDistance=25&limit=10
```

#### Refresh Recommendations
```http
POST /recommendations/refresh
```

#### Provide Feedback
```http
POST /recommendations/feedback
```

**Body:**
```json
{
  "recommendationId": "rec_123",
  "rating": 4,
  "feedback": "Great recommendation, very relevant!"
}
```

### Admin API

#### Get Analytics Overview
```http
GET /admin/recommendations/analytics/overview?startDate=2024-01-01&endDate=2024-03-01
```

#### Get All Models
```http
GET /admin/recommendations/models
```

#### Train New Model
```http
POST /admin/recommendations/models/train
```

**Body:**
```json
{
  "modelType": "hybrid",
  "config": {
    "epochs": 100,
    "batchSize": 32,
    "learningRate": 0.001
  }
}
```

#### Activate Model
```http
PUT /admin/recommendations/models/{modelId}/activate
```

#### Get Experiments
```http
GET /admin/recommendations/experiments
```

#### Create Experiment
```http
POST /admin/recommendations/experiments
```

**Body:**
```json
{
  "name": "Algorithm Comparison Test",
  "description": "Compare collaborative vs content-based filtering",
  "experimentType": "algorithm_comparison",
  "variants": [
    {
      "name": "collaborative",
      "config": { "algorithm": "collaborative" },
      "trafficPercentage": 50
    },
    {
      "name": "content_based",
      "config": { "algorithm": "content_based" },
      "trafficPercentage": 50
    }
  ],
  "targetMetrics": ["click_through_rate", "conversion_rate"],
  "startDate": "2024-03-01T00:00:00Z",
  "endDate": "2024-03-31T23:59:59Z",
  "minimumSampleSize": 1000,
  "significanceLevel": 0.05
}
```

#### Start/Stop Experiment
```http
PUT /admin/recommendations/experiments/{experimentId}/start
PUT /admin/recommendations/experiments/{experimentId}/stop
```

#### Get Experiment Report
```http
GET /admin/recommendations/experiments/{experimentId}/report
```

#### Get User Profile
```http
GET /admin/recommendations/users/{userId}/profile
```

#### Bulk Generate Recommendations
```http
POST /admin/recommendations/bulk/generate
```

**Body:**
```json
{
  "userIds": ["user_1", "user_2"],
  "batchSize": 100
}
```

#### Get Performance Metrics
```http
GET /admin/recommendations/performance/metrics?period=7d
```

#### Compare Algorithms
```http
GET /admin/recommendations/algorithms/comparison?startDate=2024-01-01&endDate=2024-03-01
```

#### Get System Health
```http
GET /admin/recommendations/health
```

## Installation & Setup

### 1. Install Dependencies

```bash
npm install @tensorflow/tfjs-node
```

### 2. Database Migration

The system will automatically create the required database tables when the module is loaded.

### 3. Environment Variables

Add to your `.env` file:

```env
# AI Recommendations Configuration
ML_MODEL_STORAGE_PATH=./models/recommendations
RECOMMENDATION_CACHE_TTL=3600
RECOMMENDATION_BATCH_SIZE=100
RECOMMENDATION_MIN_INTERACTIONS=5
AB_TEST_DEFAULT_DURATION=30
```

### 4. Module Integration

The `AIRecommendationsModule` is automatically integrated into the main `AppModule`.

## Usage Examples

### Basic Integration

```typescript
import { RecommendationEngineService } from './ai-recommendations/services/recommendation-engine.service';

@Injectable()
export class EventService {
  constructor(
    private recommendationEngine: RecommendationEngineService,
  ) {}

  async getEventWithRecommendations(eventId: string, userId: string) {
    const event = await this.getEvent(eventId);
    const recommendations = await this.recommendationEngine.getSimilarEventRecommendations(
      userId,
      eventId,
    );
    
    return {
      event,
      similarEvents: recommendations,
    };
  }
}
```

### Track User Interactions

```typescript
import { UserBehaviorTrackingService } from './ai-recommendations/services/user-behavior-tracking.service';

@Injectable()
export class TicketService {
  constructor(
    private behaviorTracking: UserBehaviorTrackingService,
  ) {}

  async purchaseTicket(userId: string, eventId: string, ticketData: any) {
    // Process ticket purchase
    const ticket = await this.createTicket(ticketData);
    
    // Track purchase interaction
    await this.behaviorTracking.trackInteraction(
      userId,
      eventId,
      'purchase',
      {
        ticketId: ticket.id,
        amount: ticket.price,
        quantity: ticket.quantity,
      },
    );
    
    return ticket;
  }
}
```

### A/B Testing Integration

```typescript
import { ABTestingService } from './ai-recommendations/services/ab-testing.service';

@Injectable()
export class HomepageService {
  constructor(
    private abTesting: ABTestingService,
    private recommendationEngine: RecommendationEngineService,
  ) {}

  async getHomepageRecommendations(userId: string) {
    // Check for active experiments
    const experimentId = 'homepage_algorithm_test';
    const variant = await this.abTesting.assignUserToVariant(userId, experimentId);
    
    // Get recommendations based on variant
    const recommendations = await this.recommendationEngine.getPersonalizedHomepageRecommendations(userId);
    
    // Record experiment metric
    await this.abTesting.recordExperimentMetric(
      experimentId,
      variant,
      'impressions',
      recommendations.length,
      { userId },
    );
    
    return recommendations;
  }
}
```

## Performance Optimization

### Caching Strategy
- User preferences cached for 1 hour
- Event metadata cached for 30 minutes
- Recommendation results cached for 15 minutes
- Model predictions cached for 5 minutes

### Batch Processing
- Bulk recommendation generation for all users
- Scheduled model retraining (daily/weekly)
- Background analytics processing
- Asynchronous interaction tracking

### Scalability Considerations
- Horizontal scaling with Redis for caching
- Database indexing on user_id, event_id, created_at
- Connection pooling for database operations
- Queue-based processing for heavy operations

## Monitoring & Analytics

### Key Metrics
- **Click-Through Rate (CTR)**: Percentage of recommendations clicked
- **Conversion Rate**: Percentage of clicks that result in purchases
- **Revenue Attribution**: Revenue generated from recommendations
- **Model Performance**: Accuracy, precision, recall metrics
- **System Performance**: Response time, throughput, error rates

### Dashboards
- Real-time recommendation performance
- A/B testing experiment results
- User engagement analytics
- Model training and deployment status
- System health monitoring

## Security & Privacy

### Data Protection
- User interaction data anonymization
- GDPR compliance for preference data
- Secure model storage and access
- Rate limiting on API endpoints

### Authentication
- JWT-based authentication for all endpoints
- Role-based access control for admin functions
- API key authentication for external integrations

## Testing

### Unit Tests
```bash
npm test -- --testPathPattern=ai-recommendations
```

### Integration Tests
```bash
npm run test:e2e -- --testPathPattern=recommendations
```

### Load Testing
```bash
npm run test:load -- --target=recommendations
```

## Deployment

### Production Checklist
- [ ] Configure environment variables
- [ ] Set up model storage directory
- [ ] Configure Redis for caching
- [ ] Set up monitoring and alerting
- [ ] Configure backup for model files
- [ ] Set up log aggregation
- [ ] Configure rate limiting
- [ ] Set up A/B testing experiments

### Model Deployment
```bash
# Train initial models
curl -X POST http://localhost:3000/admin/recommendations/models/train \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"modelType": "hybrid"}'

# Activate model
curl -X PUT http://localhost:3000/admin/recommendations/models/{modelId}/activate \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Configuration

### Model Training Configuration
```json
{
  "collaborative": {
    "minInteractions": 5,
    "userSimilarityThreshold": 0.3,
    "maxSimilarUsers": 50
  },
  "contentBased": {
    "featureWeights": {
      "category": 0.4,
      "location": 0.3,
      "price": 0.2,
      "time": 0.1
    }
  },
  "hybrid": {
    "collaborativeWeight": 0.6,
    "contentBasedWeight": 0.4,
    "epochs": 100,
    "batchSize": 32,
    "learningRate": 0.001
  }
}
```

### A/B Testing Configuration
```json
{
  "defaultExperimentDuration": 30,
  "minimumSampleSize": 1000,
  "significanceLevel": 0.05,
  "maxConcurrentExperiments": 5
}
```

## Troubleshooting

### Common Issues

#### Low Recommendation Quality
- Ensure sufficient user interaction data (minimum 5 interactions per user)
- Check model training completion and activation
- Verify user preference data quality
- Review A/B testing results for algorithm performance

#### Performance Issues
- Check database query performance and indexing
- Monitor cache hit rates and TTL settings
- Review batch processing job performance
- Check TensorFlow.js memory usage

#### A/B Testing Issues
- Verify experiment configuration and traffic allocation
- Check statistical significance requirements
- Ensure proper user assignment consistency
- Review experiment duration and sample sizes

### Debugging

Enable debug logging:
```env
LOG_LEVEL=debug
DEBUG_RECOMMENDATIONS=true
```

Monitor system health:
```bash
curl http://localhost:3000/admin/recommendations/health
```

## Future Enhancements

### Planned Features
- **Deep Learning Models**: Neural collaborative filtering
- **Real-time Personalization**: Stream processing for immediate updates
- **Cross-Platform Recommendations**: Mobile app integration
- **Social Recommendations**: Friend-based recommendations
- **Seasonal Adjustments**: Time-based preference weighting
- **Multi-Armed Bandit**: Dynamic algorithm selection

### Integration Opportunities
- **Email Marketing**: Personalized event newsletters
- **Push Notifications**: Real-time recommendation alerts
- **Social Media**: Shareable recommendation widgets
- **Mobile Apps**: Native recommendation components
- **Third-party APIs**: External event data integration

## Support

For technical support or questions about the AI recommendations system:
- Check the troubleshooting section above
- Review system health metrics
- Examine recent A/B testing results
- Monitor recommendation performance analytics

## License

This AI recommendations system is part of the Veritix platform and follows the same licensing terms.
