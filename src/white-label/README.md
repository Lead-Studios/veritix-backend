# White-Label Platform Module

A comprehensive enterprise white-label platform implementation for multi-tenant SaaS applications with custom branding, feature management, domain support, and subscription billing.

## Features

### 🏢 Multi-Tenant Architecture
- **Tenant Management**: Complete tenant lifecycle management with status tracking
- **Data Isolation**: Secure tenant-based data separation
- **Tier-based Limits**: Configurable resource limits per tenant tier
- **Usage Monitoring**: Real-time usage tracking and limit enforcement

### 🎨 Custom Branding & Theming
- **Logo & Assets**: Upload and manage custom logos, favicons, and brand assets
- **Color Schemes**: Customizable color palettes and themes
- **Typography**: Custom font configurations
- **CSS Customization**: Advanced styling with custom CSS injection
- **Email Templates**: Branded email template management

### 🌐 Domain Management
- **Subdomain Support**: Automatic subdomain provisioning (`tenant.yourapp.com`)
- **Custom Domains**: Full custom domain support with DNS verification
- **SSL Management**: Automatic SSL certificate provisioning and renewal
- **Primary Domain**: Multi-domain support with primary domain designation

### ⚙️ Feature Flag System
- **Granular Control**: Per-tenant feature enabling/disabling
- **Category-based**: Organized feature management by categories
- **Expiration Support**: Time-based feature access control
- **Bulk Operations**: Enable/disable multiple features at once
- **Configuration**: Feature-specific configuration management

### 💳 Subscription & Billing
- **Multiple Plans**: Support for various subscription tiers
- **Billing Cycles**: Monthly, quarterly, yearly, and custom cycles
- **Trial Management**: Automatic trial period handling
- **Discount Support**: Coupon codes and percentage/amount discounts
- **Status Tracking**: Complete subscription lifecycle management

### 📊 Analytics & Reporting
- **Usage Metrics**: Track tenant resource utilization
- **Performance Monitoring**: SLA compliance tracking
- **Billing Analytics**: Revenue and subscription metrics
- **Feature Usage**: Track feature adoption and usage patterns

### 🔌 Integration Management
- **Webhook Support**: Custom webhook configurations
- **API Keys**: Secure API key management
- **OAuth Integration**: Third-party OAuth provider support
- **SSO Configuration**: Single sign-on setup and management

## API Endpoints

### Tenant Management
```
POST   /white-label/tenants                    # Create tenant
GET    /white-label/tenants                    # List tenants (paginated)
GET    /white-label/tenants/:id                # Get tenant by ID
GET    /white-label/tenants/slug/:slug         # Get tenant by slug
GET    /white-label/tenants/domain/:domain     # Get tenant by domain
PATCH  /white-label/tenants/:id                # Update tenant
POST   /white-label/tenants/:id/suspend        # Suspend tenant
POST   /white-label/tenants/:id/activate       # Activate tenant
DELETE /white-label/tenants/:id                # Delete tenant (soft)
GET    /white-label/tenants/:id/usage          # Get usage statistics
POST   /white-label/tenants/:id/check-limits   # Check resource limits
```

### Branding Management
```
POST   /white-label/tenants/:tenantId/branding              # Create branding item
GET    /white-label/tenants/:tenantId/branding              # List branding items
GET    /white-label/tenants/:tenantId/branding/type/:type   # Get by type
GET    /white-label/tenants/:tenantId/branding/theme        # Get compiled theme
GET    /white-label/tenants/:tenantId/branding/:id          # Get branding item
PATCH  /white-label/tenants/:tenantId/branding/:id          # Update branding
DELETE /white-label/tenants/:tenantId/branding/:id          # Delete branding
POST   /white-label/tenants/:tenantId/branding/upload/:type # Upload asset
```

### Feature Management
```
POST   /white-label/tenants/:tenantId/features                    # Create feature
GET    /white-label/tenants/:tenantId/features                    # List features
GET    /white-label/tenants/:tenantId/features/enabled            # List enabled features
GET    /white-label/tenants/:tenantId/features/category/:category # Get by category
GET    /white-label/tenants/:tenantId/features/:featureKey        # Get feature
GET    /white-label/tenants/:tenantId/features/:featureKey/enabled # Check if enabled
GET    /white-label/tenants/:tenantId/features/:featureKey/config # Get feature config
PATCH  /white-label/tenants/:tenantId/features/:id               # Update feature
POST   /white-label/tenants/:tenantId/features/:featureKey/enable # Enable feature
POST   /white-label/tenants/:tenantId/features/:featureKey/disable # Disable feature
POST   /white-label/tenants/:tenantId/features/bulk/enable       # Bulk enable
POST   /white-label/tenants/:tenantId/features/bulk/disable      # Bulk disable
DELETE /white-label/tenants/:tenantId/features/:id               # Delete feature
```

### Domain Management
```
POST   /white-label/tenants/:tenantId/domains              # Create domain
GET    /white-label/tenants/:tenantId/domains              # List domains
GET    /white-label/tenants/:tenantId/domains/:id          # Get domain
PATCH  /white-label/tenants/:tenantId/domains/:id          # Update domain
POST   /white-label/tenants/:tenantId/domains/:id/set-primary # Set as primary
POST   /white-label/tenants/:tenantId/domains/:id/verify   # Verify domain
POST   /white-label/tenants/:tenantId/domains/:id/ssl      # Setup SSL
GET    /white-label/tenants/:tenantId/domains/ssl/expiring # Get expiring SSL
DELETE /white-label/tenants/:tenantId/domains/:id          # Delete domain
```

### Subscription Management
```
POST   /white-label/tenants/:tenantId/subscriptions           # Create subscription
GET    /white-label/tenants/:tenantId/subscriptions           # List subscriptions
GET    /white-label/tenants/:tenantId/subscriptions/active    # Get active subscription
GET    /white-label/tenants/:tenantId/subscriptions/metrics   # Get metrics
GET    /white-label/tenants/:tenantId/subscriptions/:id       # Get subscription
PATCH  /white-label/tenants/:tenantId/subscriptions/:id       # Update subscription
POST   /white-label/tenants/:tenantId/subscriptions/:id/cancel # Cancel subscription
POST   /white-label/tenants/:tenantId/subscriptions/:id/suspend # Suspend subscription
POST   /white-label/tenants/:tenantId/subscriptions/:id/reactivate # Reactivate
POST   /white-label/tenants/:tenantId/subscriptions/:id/renew # Renew subscription

# Global subscription management
GET    /white-label/subscriptions/expired-trials             # Get expired trials
GET    /white-label/subscriptions/expired                    # Get expired subscriptions
GET    /white-label/subscriptions/metrics                    # Global metrics
```

## Database Schema

### Core Entities

#### Tenant
- Multi-tenant configuration and limits
- Status tracking (trial, active, suspended, cancelled)
- Tier-based feature access (basic, professional, enterprise)
- Resource limits (users, events, tickets, storage)
- Company information and contacts

#### TenantBranding
- Brand asset management (logos, favicons)
- Color scheme and typography configuration
- Custom CSS and styling
- Email template customization

#### TenantFeature
- Feature flag management per tenant
- Category-based organization
- Expiration and configuration support
- Usage tracking and limits

#### TenantDomain
- Subdomain and custom domain support
- DNS verification and SSL management
- Primary domain designation
- Status tracking (pending, active, failed)

#### TenantSubscription
- Subscription plan management
- Billing cycle configuration
- Trial and discount support
- Payment gateway integration ready

#### TenantAnalytics
- Usage and performance metrics
- SLA compliance tracking
- Feature adoption analytics
- Billing and revenue metrics

#### TenantIntegration
- Webhook and API configurations
- OAuth and SSO integration
- Third-party service connections
- Error tracking and retry logic

## Usage Examples

### Creating a New Tenant
```typescript
const tenant = await tenantService.create({
  name: 'Acme Corporation',
  slug: 'acme-corp',
  contactEmail: 'admin@acme.com',
  tier: TenantTier.ENTERPRISE,
  maxUsers: 500,
  maxEvents: 200,
  customDomainEnabled: true,
  ssoEnabled: true,
  apiAccessEnabled: true,
});
```

### Checking Feature Access
```typescript
const hasAdvancedAnalytics = await featureService.isFeatureEnabled(
  tenantId, 
  'advanced_analytics'
);

if (hasAdvancedAnalytics) {
  const config = await featureService.getFeatureConfig(
    tenantId, 
    'advanced_analytics'
  );
  // Use feature with configuration
}
```

### Custom Branding Setup
```typescript
// Upload logo
await brandingService.uploadAsset(tenantId, BrandingType.LOGO, logoFile);

// Set color scheme
await brandingService.create(tenantId, {
  type: BrandingType.COLOR_SCHEME,
  name: 'Primary Colors',
  config: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
  },
});

// Get compiled theme
const theme = await brandingService.getThemeConfig(tenantId);
```

### Domain Management
```typescript
// Add custom domain
const domain = await domainService.create(tenantId, {
  domain: 'events.acme.com',
  type: DomainType.CUSTOM,
  isPrimary: true,
});

// Verify domain
await domainService.verify(domain.id);

// Setup SSL
await domainService.setupSsl(domain.id);
```

## Configuration

### Environment Variables
```env
# Database configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/veritix

# File upload configuration
UPLOAD_PATH=/uploads
MAX_FILE_SIZE=10485760

# SSL certificate configuration
LETSENCRYPT_EMAIL=admin@yourapp.com
LETSENCRYPT_STAGING=false

# Payment gateway (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Default Feature Sets by Tier

#### Basic Tier
- Basic event management
- Basic ticketing
- Standard support

#### Professional Tier
- All Basic features
- Advanced analytics
- Custom branding
- Priority support

#### Enterprise Tier
- All Professional features
- API access
- SSO integration
- Custom integrations
- 24/7 support
- Custom domains

## Testing

The module includes comprehensive test suites:

```bash
# Run all white-label tests
npm test -- white-label

# Run specific service tests
npm test -- tenant.service.spec.ts
npm test -- tenant-feature.service.spec.ts

# Run with coverage
npm test -- --coverage white-label
```

## Integration

### Adding to Main App Module
```typescript
import { WhiteLabelModule } from './white-label/white-label.module';

@Module({
  imports: [
    // ... other modules
    WhiteLabelModule,
  ],
})
export class AppModule {}
```

### Middleware Integration
```typescript
// Tenant resolution middleware
export class TenantMiddleware implements NestMiddleware {
  constructor(private tenantService: TenantService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const host = req.get('host');
    const tenant = await this.tenantService.findByDomain(host);
    req['tenant'] = tenant;
    next();
  }
}
```

### Feature Guard
```typescript
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private featureService: TenantFeatureService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;
    const requiredFeature = this.reflector.get<string>('feature', context.getHandler());
    
    return this.featureService.isFeatureEnabled(tenant.id, requiredFeature);
  }
}
```

## Security Considerations

- **Data Isolation**: All queries include tenant ID filtering
- **Access Control**: Feature-based access restrictions
- **Domain Verification**: DNS-based domain ownership verification
- **SSL Enforcement**: Automatic SSL certificate management
- **API Rate Limiting**: Per-tenant rate limiting support
- **Audit Logging**: All tenant operations are logged

## Performance Optimization

- **Database Indexing**: Optimized indexes for multi-tenant queries
- **Caching**: Feature flags and branding cached for performance
- **Lazy Loading**: Relations loaded only when needed
- **Pagination**: All list endpoints support pagination
- **Background Jobs**: Async processing for heavy operations

## Monitoring & Observability

- **Health Checks**: Tenant service health monitoring
- **Metrics**: Usage and performance metrics collection
- **Alerts**: SLA breach and limit exceeded notifications
- **Logging**: Structured logging with tenant context

This white-label platform provides a complete foundation for building multi-tenant SaaS applications with enterprise-grade features and scalability.
