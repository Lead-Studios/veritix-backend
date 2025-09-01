import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageIntent } from '../entities/chatbot-message.entity';

export interface NLPAnalysis {
  intent: MessageIntent;
  confidence: number;
  entities: Record<string, any>;
  sentiment: number;
  language: string;
}

export interface OpenAIResponse {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  response: string;
  actions?: string[];
}

@Injectable()
export class NLPService {
  private openaiApiKey: string;
  private openaiBaseUrl = 'https://api.openai.com/v1';

  constructor(private configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
  }

  async analyzeMessage(message: string, context?: Record<string, any>): Promise<NLPAnalysis> {
    try {
      const response = await this.callOpenAI(message, context);
      
      return {
        intent: this.mapToIntent(response.intent),
        confidence: response.confidence,
        entities: response.entities,
        sentiment: this.analyzeSentiment(message),
        language: this.detectLanguage(message),
      };
    } catch (error) {
      console.error('NLP analysis failed:', error);
      return this.fallbackAnalysis(message);
    }
  }

  async generateResponse(
    message: string,
    intent: MessageIntent,
    context?: Record<string, any>,
    language: string = 'en',
  ): Promise<string> {
    try {
      const prompt = this.buildPrompt(message, intent, context, language);
      
      const response = await fetch(`${this.openaiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(language),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      return data.choices[0]?.message?.content || this.getFallbackResponse(intent, language);
    } catch (error) {
      console.error('Response generation failed:', error);
      return this.getFallbackResponse(intent, language);
    }
  }

  async extractEntities(message: string): Promise<Record<string, any>> {
    const entities: Record<string, any> = {};

    // Extract common entities using regex patterns
    const patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      amount: /\$?\d+(?:\.\d{2})?/g,
      date: /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g,
      ticketId: /\b[A-Z0-9]{8,}\b/g,
      eventId: /\bevent[_-]?[A-Za-z0-9]+\b/gi,
    };

    for (const [entityType, pattern] of Object.entries(patterns)) {
      const matches = message.match(pattern);
      if (matches) {
        entities[entityType] = matches;
      }
    }

    return entities;
  }

  private async callOpenAI(message: string, context?: Record<string, any>): Promise<OpenAIResponse> {
    const prompt = `
Analyze this customer service message and provide intent classification:

Message: "${message}"
Context: ${JSON.stringify(context || {})}

Classify the intent as one of: greeting, ticket_inquiry, refund_request, event_info, exchange_request, complaint, general_question, escalation_request, goodbye, unknown

Respond in JSON format:
{
  "intent": "intent_name",
  "confidence": 0.95,
  "entities": {},
  "response": "suggested response",
  "actions": ["action1", "action2"]
}
    `;

    const response = await fetch(`${this.openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a customer service AI assistant for an event ticketing platform. Analyze messages and classify intents accurately.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    try {
      return JSON.parse(content);
    } catch {
      return this.fallbackOpenAIResponse(message);
    }
  }

  private mapToIntent(intentString: string): MessageIntent {
    const intentMap: Record<string, MessageIntent> = {
      greeting: MessageIntent.GREETING,
      ticket_inquiry: MessageIntent.TICKET_INQUIRY,
      refund_request: MessageIntent.REFUND_REQUEST,
      event_info: MessageIntent.EVENT_INFO,
      exchange_request: MessageIntent.EXCHANGE_REQUEST,
      complaint: MessageIntent.COMPLAINT,
      general_question: MessageIntent.GENERAL_QUESTION,
      escalation_request: MessageIntent.ESCALATION_REQUEST,
      goodbye: MessageIntent.GOODBYE,
    };

    return intentMap[intentString] || MessageIntent.UNKNOWN;
  }

  private analyzeSentiment(message: string): number {
    // Simple sentiment analysis using keyword matching
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'satisfied', 'love', 'amazing'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'disappointed'];

    const words = message.toLowerCase().split(/\s+/);
    let score = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) score += 0.1;
      if (negativeWords.includes(word)) score -= 0.1;
    });

    return Math.max(-1, Math.min(1, score));
  }

  private detectLanguage(message: string): string {
    // Simple language detection - can be enhanced with proper library
    const patterns = {
      es: /\b(hola|gracias|por favor|disculpe)\b/i,
      fr: /\b(bonjour|merci|s'il vous plaît|excusez-moi)\b/i,
      de: /\b(hallo|danke|bitte|entschuldigung)\b/i,
      it: /\b(ciao|grazie|prego|scusi)\b/i,
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(message)) {
        return lang;
      }
    }

    return 'en'; // Default to English
  }

  private buildPrompt(
    message: string,
    intent: MessageIntent,
    context?: Record<string, any>,
    language: string = 'en',
  ): string {
    return `
Customer message: "${message}"
Detected intent: ${intent}
Context: ${JSON.stringify(context || {})}
Language: ${language}

Generate a helpful, professional response for this customer service inquiry.
    `;
  }

  private getSystemPrompt(language: string): string {
    const prompts = {
      en: 'You are a helpful customer service AI assistant for Veritix, an event ticketing platform. Provide professional, empathetic, and accurate responses to customer inquiries.',
      es: 'Eres un asistente de IA de servicio al cliente útil para Veritix, una plataforma de venta de entradas para eventos. Proporciona respuestas profesionales, empáticas y precisas a las consultas de los clientes.',
      fr: 'Vous êtes un assistant IA de service client utile pour Veritix, une plateforme de billetterie d\'événements. Fournissez des réponses professionnelles, empathiques et précises aux demandes des clients.',
      de: 'Sie sind ein hilfreicher KI-Kundenservice-Assistent für Veritix, eine Event-Ticketing-Plattform. Geben Sie professionelle, einfühlsame und genaue Antworten auf Kundenanfragen.',
    };

    return prompts[language] || prompts.en;
  }

  private getFallbackResponse(intent: MessageIntent, language: string): string {
    const responses = {
      en: {
        [MessageIntent.GREETING]: 'Hello! How can I help you today?',
        [MessageIntent.TICKET_INQUIRY]: 'I can help you with your ticket inquiry. Please provide your ticket or order ID.',
        [MessageIntent.REFUND_REQUEST]: 'I understand you\'d like to request a refund. Let me help you with that process.',
        [MessageIntent.EVENT_INFO]: 'I can provide information about our events. What would you like to know?',
        [MessageIntent.EXCHANGE_REQUEST]: 'I can help you exchange your tickets. Please provide your current ticket details.',
        [MessageIntent.COMPLAINT]: 'I\'m sorry to hear about your concern. Let me help resolve this issue for you.',
        [MessageIntent.ESCALATION_REQUEST]: 'I\'ll connect you with a human agent who can better assist you.',
        [MessageIntent.GOODBYE]: 'Thank you for contacting us. Have a great day!',
        [MessageIntent.UNKNOWN]: 'I\'m not sure I understand. Could you please rephrase your question?',
      },
    };

    return responses[language]?.[intent] || responses.en[intent] || 'How can I help you today?';
  }

  private fallbackAnalysis(message: string): NLPAnalysis {
    const intent = this.classifyIntentByKeywords(message);
    
    return {
      intent,
      confidence: 0.5,
      entities: {},
      sentiment: this.analyzeSentiment(message),
      language: this.detectLanguage(message),
    };
  }

  private fallbackOpenAIResponse(message: string): OpenAIResponse {
    return {
      intent: 'unknown',
      confidence: 0.5,
      entities: {},
      response: 'I understand you need assistance. Could you please provide more details?',
      actions: [],
    };
  }

  private classifyIntentByKeywords(message: string): MessageIntent {
    const keywords = {
      [MessageIntent.GREETING]: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
      [MessageIntent.TICKET_INQUIRY]: ['ticket', 'order', 'purchase', 'booking', 'confirmation'],
      [MessageIntent.REFUND_REQUEST]: ['refund', 'money back', 'cancel', 'return'],
      [MessageIntent.EVENT_INFO]: ['event', 'show', 'concert', 'when', 'where', 'time', 'date'],
      [MessageIntent.EXCHANGE_REQUEST]: ['exchange', 'change', 'different', 'swap'],
      [MessageIntent.COMPLAINT]: ['problem', 'issue', 'wrong', 'error', 'complaint', 'disappointed'],
      [MessageIntent.ESCALATION_REQUEST]: ['agent', 'human', 'representative', 'manager', 'speak to'],
      [MessageIntent.GOODBYE]: ['bye', 'goodbye', 'thanks', 'thank you', 'that\'s all'],
    };

    const lowerMessage = message.toLowerCase();
    
    for (const [intent, words] of Object.entries(keywords)) {
      if (words.some(word => lowerMessage.includes(word))) {
        return intent as MessageIntent;
      }
    }

    return MessageIntent.UNKNOWN;
  }
}
