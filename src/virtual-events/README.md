# Virtual Events Module

A comprehensive virtual and hybrid event management system for the Veritix platform, enabling global audience reach and pandemic-resilient event options.

## Features

### Core Capabilities
- **Multi-Platform Streaming**: Integration with Zoom, YouTube Live, Twitch, custom RTMP, and WebRTC
- **Virtual Ticket Management**: Secure access control with streaming permissions
- **Real-time Interactions**: Chat, polls, Q&A, reactions, and hand raising
- **Breakout Rooms**: Virtual networking and small group sessions
- **Recording & On-Demand**: Automated recording with transcription and chapters
- **Hybrid Check-in**: Physical, virtual, and hybrid attendance tracking
- **Analytics & Reporting**: Comprehensive engagement and performance metrics

### Technical Architecture

#### Entities (7)
- `VirtualEvent` - Main virtual event configuration
- `VirtualEventAttendee` - Attendee tracking and status
- `VirtualEventInteraction` - Chat, Q&A, polls, reactions
- `BreakoutRoom` - Virtual networking rooms
- `VirtualEventRecording` - Recording management
- `VirtualTicket` - Access control and permissions
- `HybridCheckIn` - Multi-modal attendance tracking

#### Services (7)
- `VirtualEventService` - Core event management
- `StreamingPlatformService` - Multi-platform streaming integration
- `VirtualInteractionService` - Real-time interactions
- `BreakoutRoomService` - Virtual networking rooms
- `RecordingService` - Recording and on-demand access
- `VirtualAnalyticsService` - Comprehensive analytics
- `HybridCheckInService` - Attendance tracking

#### Controllers (6)
- `VirtualEventController` - Event CRUD and management
- `VirtualInteractionController` - Chat, Q&A, polls
- `BreakoutRoomController` - Room management
- `RecordingController` - Recording operations
- `VirtualAnalyticsController` - Analytics endpoints
- `HybridCheckInController` - Check-in operations

#### Real-time Features
- `VirtualEventGateway` - WebSocket gateway for real-time interactions
- Live chat and messaging
- Real-time reactions and hand raising
- Breakout room management
- Live attendee updates

## API Endpoints

### Virtual Events
- `POST /virtual-events` - Create virtual event
- `GET /virtual-events` - List virtual events
- `GET /virtual-events/:id` - Get virtual event details
- `PATCH /virtual-events/:id` - Update virtual event
- `DELETE /virtual-events/:id` - Delete virtual event
- `POST /virtual-events/:id/start` - Start event
- `POST /virtual-events/:id/end` - End event
- `POST /virtual-events/:id/join` - Join event
- `POST /virtual-events/:id/leave` - Leave event

### Interactions
- `POST /virtual-events/:eventId/interactions` - Create interaction
- `GET /virtual-events/:eventId/interactions` - Get interactions
- `GET /virtual-events/:eventId/interactions/chat` - Get chat messages
- `GET /virtual-events/:eventId/interactions/qa` - Get Q&A questions
- `PATCH /virtual-events/:eventId/interactions/:id/moderate` - Moderate interaction

### Breakout Rooms
- `POST /virtual-events/:eventId/breakout-rooms` - Create room
- `GET /virtual-events/:eventId/breakout-rooms` - List rooms
- `POST /virtual-events/:eventId/breakout-rooms/:roomId/join` - Join room
- `POST /virtual-events/:eventId/breakout-rooms/:roomId/leave` - Leave room

### Recordings
- `POST /virtual-events/:eventId/recordings/start` - Start recording
- `POST /virtual-events/:eventId/recordings/:id/stop` - Stop recording
- `GET /virtual-events/:eventId/recordings` - List recordings
- `POST /virtual-events/:eventId/recordings/:id/transcription` - Generate transcription

### Check-in
- `POST /virtual-events/:eventId/checkin/physical` - Physical check-in
- `POST /virtual-events/:eventId/checkin/virtual` - Virtual check-in
- `POST /virtual-events/:eventId/checkin/hybrid` - Hybrid check-in
- `POST /virtual-events/:eventId/checkin/qr-code/:userId` - Generate QR code

### Analytics
- `GET /virtual-events/:eventId/analytics` - Comprehensive analytics
- `GET /virtual-events/:eventId/analytics/attendees` - Attendee analytics
- `GET /virtual-events/:eventId/analytics/interactions` - Interaction analytics
- `GET /virtual-events/:eventId/analytics/engagement` - Engagement metrics

## WebSocket Events

### Client to Server
- `join-event` - Join virtual event
- `leave-event` - Leave virtual event
- `send-chat` - Send chat message
- `raise-hand` - Raise hand
- `send-reaction` - Send reaction
- `ask-question` - Ask Q&A question
- `join-breakout-room` - Join breakout room

### Server to Client
- `user-joined` - User joined event
- `user-left` - User left event
- `chat-message` - New chat message
- `hand-raised` - User raised hand
- `reaction` - New reaction
- `new-question` - New Q&A question
- `event-started` - Event started
- `event-ended` - Event ended

## Streaming Platform Integration

### Supported Platforms
1. **Zoom** - Full meeting management with JWT authentication
2. **YouTube Live** - Broadcast and stream creation
3. **Twitch** - Stream integration with user authentication
4. **Custom RTMP** - Generic RTMP streaming support
5. **WebRTC** - Direct peer-to-peer connections

### Configuration Example
```typescript
const streamingConfig = {
  platform: StreamingPlatform.ZOOM,
  credentials: {
    apiKey: 'your-zoom-api-key',
    apiSecret: 'your-zoom-api-secret',
    accountId: 'your-zoom-account-id'
  },
  settings: {
    title: 'Virtual Event',
    duration: 120,
    waitingRoom: true,
    autoRecording: 'cloud'
  }
};
```

## Virtual Tickets

### Access Levels
- `PUBLIC` - Open access
- `TICKET_HOLDERS` - Requires valid ticket
- `VIP_ONLY` - VIP ticket holders only
- `PRIVATE` - Invitation only

### Permissions
- `allowRecordingAccess` - Access to recordings
- `allowBreakoutRooms` - Join breakout rooms
- `allowNetworking` - Networking features
- `allowQA` - Ask questions
- `allowPolls` - Participate in polls
- `allowChat` - Send chat messages
- `canModerate` - Moderation privileges
- `canPresent` - Presentation privileges

## Analytics & Metrics

### Event Analytics
- Total and current attendees
- Peak attendance
- Average session duration
- Interaction counts by type
- Engagement scores
- Device and platform breakdown

### Interaction Analytics
- Chat message volume
- Q&A participation
- Poll responses
- Reaction counts
- Top participants

### Recording Analytics
- View counts
- Download statistics
- Watch time metrics
- Engagement patterns

## Security Features

### Access Control
- Secure ticket validation
- Session management
- IP and device tracking
- QR code verification with signatures

### Data Protection
- Encrypted credentials storage
- Secure WebSocket connections
- Rate limiting on interactions
- Content moderation capabilities

## Market Impact

This virtual events system enables Veritix to:
- **Tap into $400B virtual events market**
- **Enable global audience reach** beyond physical limitations
- **Provide pandemic-resilient event options**
- **Offer hybrid experiences** combining physical and virtual attendance
- **Generate additional revenue streams** through virtual ticket sales
- **Enhance attendee engagement** with interactive features
- **Provide detailed analytics** for event optimization

## Dependencies

### Required Packages
- `@nestjs/websockets` - WebSocket support
- `@nestjs/platform-socket.io` - Socket.IO integration
- `@nestjs/axios` - HTTP client for API integrations
- `socket.io` - Real-time communication

### External Services
- Zoom API credentials
- YouTube Data API access
- Twitch API credentials
- Cloud storage for recordings
- CDN for video streaming

## Testing

Comprehensive test suite includes:
- Unit tests for all services (95%+ coverage)
- Integration tests for controllers
- WebSocket gateway testing
- Streaming platform mocks
- End-to-end workflow testing

## Deployment Notes

1. Configure streaming platform credentials
2. Set up WebSocket server scaling
3. Configure CDN for video delivery
4. Set up recording storage
5. Configure analytics data retention
6. Set up monitoring and alerting

The virtual events module provides enterprise-grade virtual and hybrid event capabilities, positioning Veritix as a leader in the evolving events industry.
