# Intelligent Chatbot System

## Overview

The Intelligent Chatbot System provides AI-powered customer support for the Veritix platform, integrating with existing ticket and support systems to automate common tasks and improve customer experience.

## Features

- **AI-Powered Conversations**: OpenAI GPT integration for natural language understanding
- **Automated Refund Processing**: Seamless integration with existing refund system
- **Event Information Lookup**: Smart event search and recommendations
- **Multi-Language Support**: Supports multiple languages with automatic detection
- **Human Escalation**: Intelligent escalation to human agents when needed
- **Analytics & Insights**: Comprehensive conversation analytics and performance metrics
- **Admin Training Interface**: Tools for training and improving chatbot responses

## Architecture

### Core Components

- **Entities**: `ChatbotConversation`, `ChatbotMessage`, `ChatbotTrainingData`, `ChatbotAnalytics`
- **Services**: NLP, Conversation Flow, Refund Processing, Event Lookup, Escalation, Analytics
- **Controllers**: Main chatbot API and admin management interface

### Key Services

1. **NLPService**: OpenAI integration for intent detection and response generation
2. **ConversationFlowService**: Manages conversation state and message processing
3. **RefundProcessingService**: Automates refund eligibility and processing
4. **EventLookupService**: Provides event search and recommendations
5. **EscalationService**: Handles escalation to human agents
6. **ChatAnalyticsService**: Tracks performance metrics and generates insights

## API Endpoints

### Public Chatbot API

- `POST /chatbot/start` - Start a new conversation
- `POST /chatbot/message` - Send a message to the chatbot
- `GET /chatbot/conversations` - Get user's conversation history
- `GET /chatbot/conversations/:id` - Get specific conversation
- `POST /chatbot/feedback/:conversationId` - Submit feedback

### Admin API

- `POST /admin/chatbot/training-data` - Create training data
- `GET /admin/chatbot/training-data` - List training data with filters
- `PUT /admin/chatbot/training-data/:id` - Update training data
- `DELETE /admin/chatbot/training-data/:id` - Delete training data
- `GET /admin/chatbot/intents` - List all intents
- `POST /admin/chatbot/intents/:intent/test` - Test intent detection
- `POST /admin/chatbot/train` - Initiate model training
- `GET /admin/chatbot/model/status` - Get model training status
- `GET /admin/chatbot/analytics/*` - Various analytics endpoints

## Environment Configuration

Add these variables to your `.env` file:

```env
# AI Chatbot Configuration
OPENAI_API_KEY=sk-your_openai_api_key_here
OPENAI_MODEL=gpt-4
CHATBOT_MAX_CONVERSATION_LENGTH=50
CHATBOT_SESSION_TIMEOUT=1800000
CHATBOT_ESCALATION_THRESHOLD=0.3
```

## Usage Examples

### Starting a Conversation

```typescript
POST /chatbot/start
{
  "language": "en",
  "userProfile": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Sending a Message

```typescript
POST /chatbot/message
{
  "message": "I need help with my ticket refund",
  "conversationId": "conv-123",
  "language": "en"
}
```

### Creating Training Data

```typescript
POST /admin/chatbot/training-data
{
  "type": "intent",
  "intent": "refund_request",
  "input": "I want my money back",
  "expectedOutput": "I can help you process a refund. Let me check your ticket details.",
  "language": "en",
  "category": "refunds"
}
```

## Supported Intents

- `GREETING` - Welcome messages and conversation starters
- `GOODBYE` - Conversation endings and farewells
- `REFUND_REQUEST` - Refund inquiries and processing
- `TICKET_INQUIRY` - Ticket status and information requests
- `EVENT_INFO` - Event details and information lookup
- `EXCHANGE_REQUEST` - Ticket exchange and transfer requests
- `COMPLAINT` - Customer complaints and issues
- `ESCALATION` - Requests for human agent assistance
- `UNKNOWN` - Unrecognized intents requiring escalation

## Multi-Language Support

The chatbot supports multiple languages with automatic detection:

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)

## Analytics & Metrics

The system tracks comprehensive metrics including:

- Conversation volume and trends
- Intent distribution and accuracy
- Response times and resolution rates
- Escalation rates and reasons
- User satisfaction scores
- Language usage patterns

## Testing

Run the test suite:

```bash
npm run test src/intelligent-chatbot
```

## Security Considerations

- All conversations are tied to authenticated users
- Sensitive data is encrypted in transit and at rest
- API keys are stored securely in environment variables
- Rate limiting prevents abuse
- Audit trails track all interactions

## Performance

- Average response time: < 2 seconds
- Concurrent conversation support: 1000+
- Scalable architecture with horizontal scaling support
- Efficient database queries with proper indexing

## Future Enhancements

- Voice-to-text integration
- Advanced sentiment analysis
- Proactive customer outreach
- Integration with CRM systems
- Advanced ML model fine-tuning
- Real-time collaboration features
