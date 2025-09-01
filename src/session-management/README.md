# Session Management System

A comprehensive session management system for user authentication with device tracking, IP monitoring, and JWT invalidation capabilities.

## Features

- **Session Tracking**: Track user sessions with device information, IP addresses, and geolocation
- **JWT Invalidation**: Revoke JWT tokens and maintain a blacklist for security
- **Device Detection**: Parse user agents to identify device types, browsers, and operating systems
- **Geolocation**: Track user locations based on IP addresses
- **Session Management**: List, view, and revoke user sessions
- **Security**: Automatic session cleanup and validation

## Components

### Entities
- `UserSession`: Core session entity with device and location tracking

### Services
- `SessionManagementService`: Core session CRUD operations and JWT management
- `SessionTrackingService`: Session creation from HTTP requests
- `GeoLocationService`: IP-based geolocation lookup

### Controllers
- `SessionManagementController`: REST API endpoints for session management

### Guards
- `SessionValidationGuard`: JWT validation with session checking

## API Endpoints

### Session Management
- `GET /sessions` - List user sessions
- `GET /sessions/:id` - Get specific session
- `DELETE /sessions/:id` - Revoke specific session
- `POST /sessions/revoke-all` - Revoke all sessions (optionally except current)
- `DELETE /sessions` - Alternative bulk revocation endpoint

## Usage

### Integration with Authentication

The system automatically integrates with the authentication flow:

```typescript
// In AuthService
async login(dto: LoginDto, request?: any) {
  // ... authentication logic
  
  // Create session tracking
  const { jwtId } = await this.sessionTrackingService.createSessionFromRequest(
    user.id,
    request,
    'password',
  );

  const payload = { sub: user.id, email: user.email, roles: user.roles, jti: jwtId };
  return {
    accessToken: this.jwtService.sign(payload),
    user,
  };
}
```

### Session Validation

Use the `SessionValidationGuard` to validate sessions:

```typescript
@UseGuards(SessionValidationGuard)
@Get('protected')
async protectedRoute(@Request() req) {
  // req.user contains the validated user
  // req.sessionId contains the current session ID
  // req.jwtId contains the JWT ID
}
```

### Manual Session Management

```typescript
// Revoke a specific session
await sessionService.revokeSession(sessionId, userId, 'user', 'Security concern');

// Revoke all sessions except current
await sessionService.revokeAllSessions(userId, currentSessionId, 'user');

// Check if token is revoked
const isRevoked = await sessionService.isTokenRevoked(jwtId);
```

## Security Features

- **JWT Blacklisting**: Revoked tokens are maintained in memory for immediate validation
- **Session Expiration**: Automatic cleanup of expired sessions
- **IP Tracking**: Monitor login locations for security analysis
- **Device Fingerprinting**: Track device information for security monitoring
- **Activity Tracking**: Update last activity timestamps for session management

## Database Schema

The `UserSession` entity includes:
- JWT ID for token invalidation
- IP address and geolocation data
- Device type, browser, and OS information
- Session status and activity tracking
- Revocation information and audit trail

## Testing

Comprehensive unit tests are provided for all components:
- `session-management.service.spec.ts`
- `session-tracking.service.spec.ts`
- `session-management.controller.spec.ts`
- `session-validation.guard.spec.ts`
- `geo-location.service.spec.ts`

Run tests with:
```bash
npm test -- --testPathPattern=session-management
```

## Configuration

Add to your `.env` file:
```env
JWT_SECRET=your-jwt-secret
```

The system uses a free IP geolocation service (ip-api.com) by default. For production, consider upgrading to a paid service for better reliability and rate limits.

## Dependencies

- `@nestjs/jwt` - JWT handling
- `@nestjs/typeorm` - Database integration
- `uuid` - JWT ID generation
- `bcryptjs` - Password hashing (inherited from auth system)

## Integration

Import the `SessionManagementModule` in your auth module:

```typescript
@Module({
  imports: [
    // ... other imports
    SessionManagementModule,
  ],
  // ...
})
export class AuthModule {}
```

The system automatically tracks sessions during login, signup, and OAuth flows when the request object is passed to the authentication methods.
