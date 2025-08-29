# API Platform - Full-Featured Third-Party Integration System

A comprehensive API platform for Veritix that provides secure, scalable, and well-monitored API access for third-party developers with robust developer experience and ecosystem growth capabilities.

## 🚀 Features

### Core API Management
- **API Key Management**: Secure key generation, validation, and lifecycle management
- **Authentication & Authorization**: Role-based permissions and scope-based access control
- **Rate Limiting**: Configurable hourly, burst, and monthly limits with intelligent throttling
- **Usage Analytics**: Comprehensive tracking of API requests, responses, and performance metrics

### Developer Experience
- **Interactive Documentation**: Auto-generated API docs with live testing capabilities
- **Developer Portal**: Self-service onboarding, key management, and analytics dashboard
- **Webhook System**: Real-time event notifications with retry logic and delivery tracking
- **SDK Generation**: Automated SDK generation for popular programming languages

### Monitoring & Analytics
- **Real-time Monitoring**: API usage, performance, and error tracking
- **Analytics Dashboard**: Usage trends, top endpoints, and performance insights
- **Error Tracking**: Detailed error logging and analysis
- **Health Monitoring**: System health checks and alerting

## 📋 Architecture

### Entities
- **ApiKey**: API key management with permissions, scopes, and rate limits
- **ApiUsage**: Detailed request/response logging and analytics
- **Webhook**: Event subscription and delivery management
- **WebhookDelivery**: Delivery tracking with retry logic
- **Developer**: Developer account management and tier system
- **ApiDocumentation**: Interactive documentation system

### Services
- **ApiKeyService**: Key lifecycle, validation, and permission checking
- **ApiUsageService**: Usage tracking and analytics generation
- **RateLimiterService**: Multi-tier rate limiting and quota management
- **WebhookService**: Event triggering and delivery management

### Security Features
- **API Key Hashing**: Secure bcrypt hashing with prefix-based lookup
- **IP Whitelisting**: Restrict API access by IP address
- **Domain Whitelisting**: Control access by referrer domain
- **Webhook Signatures**: HMAC SHA-256 signature verification
- **Request Sanitization**: Automatic removal of sensitive data from logs

## 🛠️ Installation

1. **Install Dependencies**
```bash
npm install @nestjs/common @nestjs/core @nestjs/typeorm typeorm bcrypt crypto
npm install @nestjs/axios axios
```

2. **Database Setup**
```bash
# Run migrations to create API platform tables
npm run migration:run
```

3. **Environment Variables**
```env
# API Platform Configuration
API_RATE_LIMIT_WINDOW=3600000  # 1 hour in milliseconds
API_RATE_LIMIT_MAX=1000        # Max requests per window
API_WEBHOOK_TIMEOUT=30000      # Webhook timeout in milliseconds
API_WEBHOOK_MAX_RETRIES=3      # Max webhook retry attempts
```

## 📚 Usage

### 1. API Key Management

```typescript
// Create API key
const apiKeyResponse = await apiKeyService.create({
  name: 'My Application',
  type: ApiKeyType.STANDARD,
  permissions: [ApiPermission.READ, ApiPermission.WRITE],
  scopes: ['users:read', 'events:write'],
  tenantId: 'tenant-123',
  userId: 'user-456',
});

// Validate API key
const apiKey = await apiKeyService.validateApiKey('vx_live_1234567890abcdef');
```

### 2. Rate Limiting

```typescript
// Check rate limits
const rateLimit = await rateLimiterService.checkRateLimit(apiKey, '/api/users');
if (!rateLimit.allowed) {
  throw new TooManyRequestsException('Rate limit exceeded');
}
```

### 3. Webhook Management

```typescript
// Create webhook
const webhook = await webhookService.create({
  url: 'https://example.com/webhook',
  events: ['user.created', 'user.updated'],
  description: 'User events webhook',
  tenantId: 'tenant-123',
});

// Trigger webhook
await webhookService.trigger('user.created', { userId: '123' }, 'tenant-123');
```

### 4. Usage Analytics

```typescript
// Get usage analytics
const analytics = await apiUsageService.getAnalytics({
  tenantId: 'tenant-123',
  days: 30,
  groupBy: 'day',
});
```

## 🔐 Authentication

### API Key Authentication

Include your API key in requests using one of these methods:

**Authorization Header (Recommended)**
```http
Authorization: Bearer vx_live_1234567890abcdef
```

**Custom Header**
```http
X-API-Key: vx_live_1234567890abcdef
```

**Query Parameter (Development Only)**
```http
GET /api/users?api_key=vx_live_1234567890abcdef
```

### Permissions

- **READ**: View resources and data
- **WRITE**: Create and update resources
- **DELETE**: Remove resources
- **ADMIN**: Full administrative access

### Scopes

Scopes provide fine-grained access control:
- `users:read` - Read user data
- `users:write` - Create/update users
- `events:*` - Full access to events
- `tickets:read` - Read ticket information

## 📊 Rate Limits

### Default Limits
- **Hourly**: 1,000 requests per hour
- **Burst**: 100 requests per minute
- **Monthly**: 50,000 requests per month

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 3600
```

## 🔔 Webhooks

### Event Types
- `user.created` - New user registration
- `user.updated` - User profile changes
- `event.created` - New event created
- `ticket.purchased` - Ticket purchase completed
- `payment.completed` - Payment processed

### Webhook Security
All webhooks include HMAC SHA-256 signatures:
```http
X-Webhook-Signature: sha256=1234567890abcdef...
```

### Retry Logic
- **Max Retries**: 3 attempts
- **Backoff**: Exponential (1s, 2s, 4s)
- **Timeout**: 30 seconds per attempt

## 📈 Analytics & Monitoring

### Available Metrics
- Request count and rate
- Response times and status codes
- Error rates and types
- Top endpoints and users
- Geographic distribution

### Dashboard Endpoints
- `GET /api/v1/analytics/usage` - Usage analytics
- `GET /api/v1/analytics/errors` - Error analytics
- `GET /api/v1/analytics/performance` - Performance metrics
- `GET /api/v1/analytics/dashboard` - Combined dashboard data

## 🧪 Testing

```bash
# Run API platform tests
npm run test src/api-platform

# Run specific service tests
npm run test src/api-platform/services/api-key.service.spec.ts
```

## 📖 API Documentation

Interactive API documentation is available at:
- Development: `http://localhost:3000/api/docs`
- Production: `https://api.veritix.com/docs`

## 🔧 Configuration

### Developer Tiers
- **FREE**: 1,000 requests/month, basic features
- **BASIC**: 10,000 requests/month, webhooks included
- **PRO**: 100,000 requests/month, priority support
- **ENTERPRISE**: Unlimited requests, custom features

### Webhook Configuration
```typescript
{
  url: 'https://your-app.com/webhook',
  events: ['user.created', 'payment.completed'],
  headers: { 'Authorization': 'Bearer your-token' },
  maxRetries: 3,
  timeout: 30000,
  filters: { eventType: 'premium' }
}
```

## 🚨 Error Handling

### Common Error Codes
- `401` - Invalid or missing API key
- `403` - Insufficient permissions or scope
- `429` - Rate limit exceeded
- `500` - Internal server error

### Error Response Format
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Hourly rate limit exceeded",
    "details": {
      "limit": 1000,
      "remaining": 0,
      "resetTime": "2024-01-01T12:00:00Z"
    }
  }
}
```

## 🔄 Migration & Deployment

### Database Migrations
```bash
# Generate migration
npm run migration:generate -- -n CreateApiPlatformTables

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

### Production Deployment
1. Set environment variables
2. Run database migrations
3. Start the application
4. Configure load balancer
5. Set up monitoring and alerts

## 📞 Support

For API platform support:
- Documentation: `/api/docs`
- Developer Portal: `/developer`
- Support Email: api-support@veritix.com
- Status Page: `https://status.veritix.com`

## 🔗 Related Modules

- **White Label Platform**: Multi-tenant customization
- **Mobile Wallet Integration**: Apple Wallet & Google Pay
- **Advanced Seat Selection**: Interactive seat maps
- **QA Polls System**: Event feedback and surveys

---

**Built with ❤️ by the Veritix Team**
