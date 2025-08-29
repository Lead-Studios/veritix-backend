# Login Security Module

A comprehensive login security system for Veritix that detects new locations and devices, tracks login attempts, and sends security notifications to users.

## Features

### Location Detection
- **Geo-IP Lookup**: Automatically detects user location based on IP address
- **New Location Detection**: Identifies logins from previously unseen locations
- **Distance Calculation**: Uses haversine formula to calculate distances between locations
- **Private IP Handling**: Properly handles localhost and private network IPs

### Device Fingerprinting
- **User Agent Parsing**: Extracts device, browser, and OS information
- **Device Fingerprinting**: Creates unique fingerprints for device identification
- **New Device Detection**: Identifies logins from new devices
- **Trusted Device Management**: Maintains list of user's trusted devices

### Login Tracking
- **Comprehensive Logging**: Records all login attempts with detailed metadata
- **Success/Failure Tracking**: Monitors both successful and failed login attempts
- **Suspicious Activity Detection**: Identifies potentially malicious login patterns
- **Multi-tenant Support**: Full support for multi-tenant architecture

### Security Notifications
- **Real-time Alerts**: Immediate notifications for security events
- **Multiple Channels**: Email, SMS, push, and in-app notifications
- **Customizable Templates**: Rich HTML email templates with security details
- **Notification History**: Complete audit trail of all security notifications

## API Endpoints

### Login Security
- `GET /login-security/login-history` - Get user's login history
- `GET /login-security/trusted-devices` - Get user's trusted devices
- `PATCH /login-security/trusted-devices/:deviceId/revoke` - Revoke a trusted device
- `GET /login-security/security-stats` - Get security statistics

### Notifications
- `GET /login-security/notifications` - Get security notifications
- `GET /login-security/notifications/unread-count` - Get unread notification count
- `PATCH /login-security/notifications/:id/read` - Mark notification as read

## Database Schema

### Core Entities
- **LoginAttempt**: Complete login attempt records with location and device data
- **TrustedDevice**: User's trusted devices with expiration dates
- **SecurityNotification**: Security alerts and notifications

### Key Features
- Comprehensive indexing for performance
- Soft deletes for data retention
- Multi-tenant support with `ownerId`
- Rich metadata storage with JSON fields

## Integration with Authentication

### Usage in Login Flow
```typescript
// In your authentication service
import { LoginSecurityService, LoginMethod, LoginStatus } from './login-security/services/login-security.service';

async login(email: string, password: string, req: Request) {
  const loginContext = {
    userId: user.id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    method: LoginMethod.EMAIL_PASSWORD,
    ownerId: user.ownerId,
  };

  try {
    // Perform authentication
    const user = await this.validateUser(email, password);
    
    // Record successful login
    await this.loginSecurityService.recordLoginAttempt(
      loginContext,
      LoginStatus.SUCCESS
    );
    
    return user;
  } catch (error) {
    // Record failed login
    await this.loginSecurityService.recordLoginAttempt(
      loginContext,
      LoginStatus.FAILED,
      error.message
    );
    
    throw error;
  }
}
```

## Security Features

### New Location Detection
- Uses IP geolocation to determine user location
- Compares with historical login locations
- Configurable distance threshold (default: 100km)
- Handles VPNs and proxy servers gracefully

### New Device Detection
- Creates unique device fingerprints from user agent
- Maintains trusted device registry
- Automatic device expiration (90 days)
- Device revocation capabilities

### Suspicious Activity Detection
- Multiple failed login attempts
- New location + new device combinations
- Rapid login attempts from different locations
- Unusual login patterns

### Notification System
- Immediate email alerts for security events
- Rich HTML templates with event details
- Retry mechanism for failed notifications
- User preference management

## Configuration

### Environment Variables
```bash
# Geo-IP Service (optional)
GEO_IP_API_KEY=your_api_key_here

# Email Service Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@veritix.com
SMTP_PASS=your_password

# Security Settings
LOGIN_SECURITY_LOCATION_THRESHOLD_KM=100
LOGIN_SECURITY_DEVICE_EXPIRY_DAYS=90
LOGIN_SECURITY_MAX_FAILED_ATTEMPTS=5
```

## Testing

Comprehensive test suites cover:
- Geo-IP location detection and distance calculations
- Device fingerprinting and parsing
- Login attempt recording and analysis
- Security notification generation and delivery
- Integration with authentication flows

Run tests:
```bash
npm test login-security
```

## Security Considerations

### Data Privacy
- IP addresses are hashed for privacy
- Location data is aggregated (city-level)
- User agent strings are processed securely
- GDPR compliance for data retention

### Performance
- Efficient database indexing
- Async notification processing
- Caching for frequent lookups
- Rate limiting for API endpoints

### Reliability
- Graceful degradation if geo-IP service fails
- Retry mechanisms for notifications
- Comprehensive error handling
- Monitoring and alerting integration

## Monitoring and Analytics

### Security Metrics
- Login success/failure rates
- New location detection frequency
- Device registration patterns
- Notification delivery rates

### Alerting
- High failure rates
- Unusual geographic patterns
- Notification delivery failures
- System performance issues
