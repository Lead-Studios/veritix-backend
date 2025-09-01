import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { UserPreference, PreferenceType } from '../entities/user-preference.entity';
import { UserInteraction, InteractionType } from '../entities/user-interaction.entity';
import { RecommendationReason } from '../entities/recommendation.entity';

export interface ContentBasedRecommendation {
  eventId: string;
  score: number;
  reasons: RecommendationReason[];
  matchingFeatures: string[];
  confidence: number;
}

export interface EventFeatures {
  eventId: string;
  category: string;
  location: string;
  priceRange: string;
  duration: number;
  capacity: number;
  tags: string[];
  description: string;
  features: Record<string, number>;
}

@Injectable()
export class ContentBasedFilteringService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(UserPreference)
    private preferenceRepository: Repository<UserPreference>,
    @InjectRepository(UserInteraction)
    private interactionRepository: Repository<UserInteraction>,
  ) {}

  async generateRecommendations(
    userId: string,
    limit = 10,
  ): Promise<ContentBasedRecommendation[]> {
    // Get user preferences
    const userPreferences = await this.getUserPreferenceProfile(userId);
    
    if (Object.keys(userPreferences).length === 0) {
      return this.getFallbackRecommendations(userId, limit);
    }

    // Get candidate events (exclude events user already interacted with)
    const excludeEventIds = await this.getUserInteractedEvents(userId);
    const candidateEvents = await this.getCandidateEvents(excludeEventIds);

    // Extract features for all candidate events
    const eventFeatures = await this.extractEventFeatures(candidateEvents);

    // Calculate content-based scores
    const recommendations: ContentBasedRecommendation[] = [];

    for (const eventFeature of eventFeatures) {
      const score = this.calculateContentScore(userPreferences, eventFeature);
      
      if (score > 0.1) {
        const matchingFeatures = this.getMatchingFeatures(userPreferences, eventFeature);
        
        recommendations.push({
          eventId: eventFeature.eventId,
          score,
          reasons: this.determineReasons(matchingFeatures),
          matchingFeatures,
          confidence: Math.min(score * 0.8, 1.0),
        });
      }
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async getUserPreferenceProfile(userId: string): Promise<Record<string, number>> {
    const preferences = await this.preferenceRepository.find({
      where: { userId, isActive: true },
      order: { weight: 'DESC' },
    });

    const profile: Record<string, number> = {};

    for (const pref of preferences) {
      const key = `${pref.preferenceType}:${pref.preferenceValue}`;
      profile[key] = pref.weight * pref.confidence;
    }

    return profile;
  }

  private async getUserInteractedEvents(userId: string): Promise<string[]> {
    const interactions = await this.interactionRepository.find({
      where: { userId },
      select: ['eventId'],
    });

    return [...new Set(interactions.map(i => i.eventId).filter(Boolean))];
  }

  private async getCandidateEvents(excludeEventIds: string[]): Promise<Event[]> {
    const query = this.eventRepository
      .createQueryBuilder('event')
      .where('event.status = :status', { status: 'PUBLISHED' })
      .andWhere('event.isArchived = :archived', { archived: false });

    if (excludeEventIds.length > 0) {
      query.andWhere('event.id NOT IN (:...excludeIds)', { excludeIds: excludeEventIds });
    }

    return query
      .orderBy('event.createdAt', 'DESC')
      .limit(1000)
      .getMany();
  }

  private async extractEventFeatures(events: Event[]): Promise<EventFeatures[]> {
    const features: EventFeatures[] = [];

    for (const event of events) {
      const eventFeatures = await this.extractSingleEventFeatures(event);
      features.push(eventFeatures);
    }

    return features;
  }

  private async extractSingleEventFeatures(event: Event): Promise<EventFeatures> {
    // Extract numerical features from event
    const features: Record<string, number> = {};

    // Location features
    features.location_country = this.hashString(event.country);
    features.location_state = this.hashString(event.state);
    features.location_city = this.hashString(event.localGovernment);

    // Capacity features
    features.capacity = Math.log(event.ticketQuantity + 1);
    features.capacity_small = event.ticketQuantity < 100 ? 1 : 0;
    features.capacity_medium = event.ticketQuantity >= 100 && event.ticketQuantity < 1000 ? 1 : 0;
    features.capacity_large = event.ticketQuantity >= 1000 ? 1 : 0;

    // Text features from name and description
    const textFeatures = this.extractTextFeatures(event.name);
    Object.assign(features, textFeatures);

    // Price features (would need to get from ticket tiers)
    features.has_tickets = event.ticketQuantity > 0 ? 1 : 0;

    return {
      eventId: event.id,
      category: 'general', // Would extract from event metadata
      location: `${event.state}, ${event.country}`,
      priceRange: 'medium', // Would calculate from ticket prices
      duration: 120, // Would extract from event metadata
      capacity: event.ticketQuantity,
      tags: this.extractTags(event.name),
      description: event.name,
      features,
    };
  }

  private extractTextFeatures(text: string): Record<string, number> {
    const features: Record<string, number> = {};
    const words = text.toLowerCase().split(/\s+/);

    // Common event keywords
    const keywords = [
      'music', 'concert', 'festival', 'conference', 'workshop', 'seminar',
      'sports', 'game', 'match', 'tournament', 'comedy', 'theater',
      'art', 'exhibition', 'food', 'wine', 'tech', 'business',
    ];

    for (const keyword of keywords) {
      features[`keyword_${keyword}`] = words.includes(keyword) ? 1 : 0;
    }

    return features;
  }

  private extractTags(eventName: string): string[] {
    const tags: string[] = [];
    const name = eventName.toLowerCase();

    if (name.includes('music') || name.includes('concert')) tags.push('music');
    if (name.includes('food') || name.includes('restaurant')) tags.push('food');
    if (name.includes('tech') || name.includes('technology')) tags.push('technology');
    if (name.includes('business') || name.includes('conference')) tags.push('business');
    if (name.includes('art') || name.includes('gallery')) tags.push('art');
    if (name.includes('sports') || name.includes('game')) tags.push('sports');

    return tags;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 1000000; // Normalize
  }

  private calculateContentScore(
    userProfile: Record<string, number>,
    eventFeatures: EventFeatures,
  ): number {
    let score = 0;
    let totalWeight = 0;

    // Match categorical preferences
    for (const [prefKey, prefWeight] of Object.entries(userProfile)) {
      const [prefType, prefValue] = prefKey.split(':');
      
      switch (prefType) {
        case PreferenceType.CATEGORY:
          if (eventFeatures.category === prefValue) {
            score += prefWeight * 0.3;
            totalWeight += 0.3;
          }
          break;
        case PreferenceType.LOCATION:
          if (eventFeatures.location.includes(prefValue)) {
            score += prefWeight * 0.2;
            totalWeight += 0.2;
          }
          break;
        case PreferenceType.PRICE_RANGE:
          if (eventFeatures.priceRange === prefValue) {
            score += prefWeight * 0.15;
            totalWeight += 0.15;
          }
          break;
      }
    }

    // Match feature vectors
    const featureScore = this.calculateFeatureVectorSimilarity(userProfile, eventFeatures.features);
    score += featureScore * 0.35;
    totalWeight += 0.35;

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  private calculateFeatureVectorSimilarity(
    userProfile: Record<string, number>,
    eventFeatures: Record<string, number>,
  ): number {
    let dotProduct = 0;
    let userNorm = 0;
    let eventNorm = 0;

    const allFeatures = new Set([
      ...Object.keys(userProfile),
      ...Object.keys(eventFeatures),
    ]);

    for (const feature of allFeatures) {
      const userValue = userProfile[feature] || 0;
      const eventValue = eventFeatures[feature] || 0;

      dotProduct += userValue * eventValue;
      userNorm += userValue * userValue;
      eventNorm += eventValue * eventValue;
    }

    if (userNorm === 0 || eventNorm === 0) return 0;

    return dotProduct / (Math.sqrt(userNorm) * Math.sqrt(eventNorm));
  }

  private getMatchingFeatures(
    userProfile: Record<string, number>,
    eventFeatures: EventFeatures,
  ): string[] {
    const matches: string[] = [];

    for (const [prefKey, prefWeight] of Object.entries(userProfile)) {
      if (prefWeight > 0.5) {
        const [prefType, prefValue] = prefKey.split(':');
        
        switch (prefType) {
          case PreferenceType.CATEGORY:
            if (eventFeatures.category === prefValue) {
              matches.push(`category:${prefValue}`);
            }
            break;
          case PreferenceType.LOCATION:
            if (eventFeatures.location.includes(prefValue)) {
              matches.push(`location:${prefValue}`);
            }
            break;
        }
      }
    }

    return matches;
  }

  private determineReasons(matchingFeatures: string[]): RecommendationReason[] {
    const reasons: RecommendationReason[] = [];

    for (const feature of matchingFeatures) {
      if (feature.startsWith('category:')) {
        reasons.push(RecommendationReason.CATEGORY_PREFERENCE);
      } else if (feature.startsWith('location:')) {
        reasons.push(RecommendationReason.LOCATION_BASED);
      } else if (feature.startsWith('price:')) {
        reasons.push(RecommendationReason.PRICE_PREFERENCE);
      }
    }

    if (reasons.length === 0) {
      reasons.push(RecommendationReason.PAST_BEHAVIOR);
    }

    return [...new Set(reasons)];
  }

  private async getFallbackRecommendations(
    userId: string,
    limit: number,
  ): Promise<ContentBasedRecommendation[]> {
    // Return trending events as fallback
    const trendingEvents = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.status = :status', { status: 'PUBLISHED' })
      .andWhere('event.isArchived = :archived', { archived: false })
      .orderBy('event.createdAt', 'DESC')
      .limit(limit)
      .getMany();

    return trendingEvents.map(event => ({
      eventId: event.id,
      score: 0.5,
      reasons: [RecommendationReason.TRENDING],
      matchingFeatures: [],
      confidence: 0.3,
    }));
  }
}
