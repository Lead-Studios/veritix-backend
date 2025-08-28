# Q&A and Polls Module

A comprehensive Q&A and polling system for Veritix events that supports attendee engagement through questions and interactive polls.

## Features

### Questions & Answers
- **Question Submission**: Attendees can submit questions before or during events
- **Anonymous Questions**: Support for anonymous question submission
- **Question Voting**: Upvote/downvote system for question prioritization
- **Question Moderation**: Approval/rejection workflow with moderation notes
- **Answer Management**: Event organizers can provide answers to questions
- **Question Prioritization**: Pin important questions and set priority levels

### Polls
- **Multiple Poll Types**:
  - Single Choice: Select one option
  - Multiple Choice: Select multiple options
  - Rating: Rate from 1-10
  - Text Response: Open-ended text answers
- **Poll Scheduling**: Set start and end times for polls
- **Real-time Voting**: Live voting with instant result updates
- **Anonymous Voting**: Support for anonymous poll participation
- **Results Control**: Configure when and how results are shown
- **Poll Moderation**: Approval workflow for poll submissions

### Real-time Features
- **WebSocket Integration**: Live updates for new questions, polls, and votes
- **Event Rooms**: Attendees join event-specific rooms for updates
- **Live Results**: Real-time poll result updates

## API Endpoints

### Questions
- `POST /questions` - Submit a new question
- `GET /questions/event/:eventId` - Get questions for an event
- `GET /questions/:id` - Get specific question
- `PATCH /questions/:id` - Update question (answer, moderate)
- `DELETE /questions/:id` - Delete question
- `POST /questions/vote` - Vote on a question
- `DELETE /questions/vote/:questionId` - Remove vote
- `PATCH /questions/:id/moderate` - Moderate question

### Polls
- `POST /polls` - Create a new poll
- `GET /polls/event/:eventId` - Get polls for an event
- `GET /polls/:id` - Get specific poll
- `PATCH /polls/:id` - Update poll
- `DELETE /polls/:id` - Delete poll
- `POST /polls/vote` - Vote in a poll
- `GET /polls/:id/my-vote` - Get user's vote
- `GET /polls/:id/results` - Get poll results
- `PATCH /polls/:id/moderate` - Moderate poll

## Database Schema

### Core Entities
- **Question**: Question content, status, voting counts
- **QuestionVote**: User votes on questions
- **Poll**: Poll configuration and metadata
- **PollOption**: Available choices for polls
- **PollVote**: User votes in polls

### Key Features
- Multi-tenant support with `ownerId` field
- Soft deletes for data retention
- Comprehensive audit trails
- Flexible poll configuration options

## Usage Examples

### Submit a Question
```typescript
const question = await questionService.create({
  content: "What time does the networking session start?",
  eventId: "event-123",
  isAnonymous: false,
  priority: QuestionPriority.MEDIUM
}, userId, ownerId);
```

### Create a Poll
```typescript
const poll = await pollService.create({
  title: "Which session interests you most?",
  type: PollType.SINGLE_CHOICE,
  eventId: "event-123",
  options: [
    { text: "AI & Machine Learning", order: 0 },
    { text: "Blockchain Technology", order: 1 },
    { text: "Sustainable Tech", order: 2 }
  ]
}, userId, ownerId);
```

### Vote in a Poll
```typescript
await pollService.vote({
  pollId: "poll-123",
  optionIds: ["option-456"],
  isAnonymous: false
}, userId, ownerId);
```

## WebSocket Events

### Client Events
- `joinEvent` - Join event room for updates
- `leaveEvent` - Leave event room

### Server Events
- `questionUpdate` - New/updated question
- `pollUpdate` - New/updated poll
- `questionModerated` - Question moderation result
- `pollModerated` - Poll moderation result
- `pollResults` - Real-time poll results

## Testing

Comprehensive test suites are provided for:
- Question service functionality
- Poll service functionality
- Controller endpoints
- WebSocket gateway events

Run tests with:
```bash
npm test qa-polls
```

## Integration

The module is integrated into the main Veritix application through:
- `QaPollsModule` in `app.module.ts`
- Database entities registered with TypeORM
- WebSocket gateway for real-time features
- RESTful API endpoints with Swagger documentation
