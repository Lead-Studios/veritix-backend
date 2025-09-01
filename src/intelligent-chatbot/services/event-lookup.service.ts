import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { Event } from '../../events/entities/event.entity';

export interface EventSearchResult {
  id: string;
  name: string;
  description: string;
  date: string;
  venue: string;
  location: string;
  ticketsAvailable: boolean;
  priceRange: { min: number; max: number };
}

export interface EventRecommendation {
  event: EventSearchResult;
  score: number;
  reason: string;
}

@Injectable()
export class EventLookupService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async searchEvents(entities: Record<string, any>): Promise<EventSearchResult[]> {
    const searchCriteria: any = {};

    // Build search criteria from extracted entities
    if (entities.eventName) {
      searchCriteria.name = Like(`%${entities.eventName}%`);
    }

    if (entities.location) {
      searchCriteria.city = Like(`%${entities.location}%`);
    }

    if (entities.date) {
      const searchDate = new Date(entities.date);
      const startDate = new Date(searchDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(searchDate);
      endDate.setHours(23, 59, 59, 999);
      
      searchCriteria.date = Between(startDate, endDate);
    }

    const events = await this.eventRepository.find({
      where: searchCriteria,
      relations: ['ticketTiers'],
      take: 10,
      order: { createdAt: 'DESC' },
    });

    return events.map(event => this.mapToSearchResult(event));
  }

  async getEventById(eventId: string): Promise<EventSearchResult | null> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['ticketTiers', 'organizer'],
    });

    if (!event) return null;

    return this.mapToSearchResult(event);
  }

  async getRecommendations(
    userId?: string,
    preferences?: Record<string, any>,
  ): Promise<EventRecommendation[]> {
    // Get upcoming events
    const upcomingEvents = await this.eventRepository.find({
      where: {
        status: 'PUBLISHED',
        // date: MoreThan(new Date()),
      },
      relations: ['ticketTiers'],
      take: 20,
      order: { createdAt: 'DESC' },
    });

    const recommendations: EventRecommendation[] = [];

    for (const event of upcomingEvents) {
      const score = await this.calculateRecommendationScore(event, userId, preferences);
      const reason = this.generateRecommendationReason(event, score);

      recommendations.push({
        event: this.mapToSearchResult(event),
        score,
        reason,
      });
    }

    // Sort by score and return top 5
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  async searchEventsByKeyword(keyword: string): Promise<EventSearchResult[]> {
    const events = await this.eventRepository.find({
      where: [
        { name: Like(`%${keyword}%`) },
        { description: Like(`%${keyword}%`) },
        { category: Like(`%${keyword}%`) },
      ],
      relations: ['ticketTiers'],
      take: 10,
      order: { createdAt: 'DESC' },
    });

    return events.map(event => this.mapToSearchResult(event));
  }

  async getPopularEvents(limit: number = 10): Promise<EventSearchResult[]> {
    const events = await this.eventRepository.find({
      where: { status: 'PUBLISHED' },
      relations: ['ticketTiers', 'views'],
      take: limit,
      order: { createdAt: 'DESC' },
    });

    // Sort by view count (if available)
    const sortedEvents = events.sort((a, b) => {
      const aViews = a.views?.length || 0;
      const bViews = b.views?.length || 0;
      return bViews - aViews;
    });

    return sortedEvents.map(event => this.mapToSearchResult(event));
  }

  async getEventsByLocation(location: string): Promise<EventSearchResult[]> {
    const events = await this.eventRepository.find({
      where: [
        { city: Like(`%${location}%`) },
        { state: Like(`%${location}%`) },
        { country: Like(`%${location}%`) },
      ],
      relations: ['ticketTiers'],
      take: 10,
      order: { createdAt: 'DESC' },
    });

    return events.map(event => this.mapToSearchResult(event));
  }

  async getEventsByDateRange(startDate: Date, endDate: Date): Promise<EventSearchResult[]> {
    const events = await this.eventRepository.find({
      where: {
        // date: Between(startDate, endDate),
        status: 'PUBLISHED',
      },
      relations: ['ticketTiers'],
      take: 20,
      order: { createdAt: 'ASC' },
    });

    return events.map(event => this.mapToSearchResult(event));
  }

  private mapToSearchResult(event: Event): EventSearchResult {
    const ticketTiers = event.ticketTiers || [];
    const prices = ticketTiers.map(tier => tier.price).filter(price => price > 0);
    
    const priceRange = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
    };

    return {
      id: event.id,
      name: event.name,
      description: event.description || 'No description available',
      date: event.createdAt.toISOString(), // Using createdAt as placeholder
      venue: event.venue || 'TBD',
      location: `${event.city || ''}, ${event.state || ''}, ${event.country || ''}`.trim(),
      ticketsAvailable: event.ticketQuantity > 0,
      priceRange,
    };
  }

  private async calculateRecommendationScore(
    event: Event,
    userId?: string,
    preferences?: Record<string, any>,
  ): Promise<number> {
    let score = 0.5; // Base score

    // Boost score based on event popularity
    const viewCount = event.views?.length || 0;
    score += Math.min(0.3, viewCount / 1000);

    // Boost score based on user preferences
    if (preferences) {
      if (preferences.preferredCategories?.includes(event.category)) {
        score += 0.2;
      }
      
      if (preferences.preferredLocation === event.city) {
        score += 0.15;
      }
    }

    // Boost score for events with available tickets
    if (event.ticketQuantity > 0) {
      score += 0.1;
    }

    // Reduce score for events that are far in the future
    const eventDate = new Date(event.createdAt); // Using createdAt as placeholder
    const daysUntilEvent = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntilEvent > 90) {
      score -= 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  private generateRecommendationReason(event: Event, score: number): string {
    if (score > 0.8) return 'Highly recommended based on your interests';
    if (score > 0.6) return 'Popular event in your area';
    if (score > 0.4) return 'Matches your preferences';
    return 'Trending event';
  }
}
