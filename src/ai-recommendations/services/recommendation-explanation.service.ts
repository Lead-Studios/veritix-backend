import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreference } from '../entities/user-preference.entity';
import { UserInteraction } from '../entities/user-interaction.entity';
import { Recommendation } from '../entities/recommendation.entity';

export interface ExplanationContext {
  userId: string;
  eventId: string;
  algorithm: string;
  score: number;
  features?: Record<string, any>;
  similarUsers?: string[];
  userPreferences?: any[];
  eventMetadata?: Record<string, any>;
}

export interface RecommendationExplanation {
  primary: string;
  secondary: string[];
  factors: Array<{
    factor: string;
    weight: number;
    description: string;
  }>;
  confidence: number;
  personalizedReasons: string[];
}

@Injectable()
export class RecommendationExplanationService {
  constructor(
    @InjectRepository(UserPreference)
    private userPreferenceRepository: Repository<UserPreference>,
    @InjectRepository(UserInteraction)
    private userInteractionRepository: Repository<UserInteraction>,
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
  ) {}

  async generateExplanation(context: ExplanationContext): Promise<RecommendationExplanation> {
    const userPreferences = await this.getUserPreferences(context.userId);
    const userInteractions = await this.getRecentInteractions(context.userId);
    
    switch (context.algorithm) {
      case 'collaborative':
        return this.generateCollaborativeExplanation(context, userPreferences, userInteractions);
      case 'content_based':
        return this.generateContentBasedExplanation(context, userPreferences, userInteractions);
      case 'hybrid':
        return this.generateHybridExplanation(context, userPreferences, userInteractions);
      case 'trending':
        return this.generateTrendingExplanation(context, userPreferences);
      case 'location':
        return this.generateLocationExplanation(context, userPreferences);
      default:
        return this.generateGenericExplanation(context, userPreferences);
    }
  }

  private async generateCollaborativeExplanation(
    context: ExplanationContext,
    userPreferences: UserPreference[],
    userInteractions: UserInteraction[],
  ): Promise<RecommendationExplanation> {
    const similarUsers = context.similarUsers || [];
    const eventMetadata = context.eventMetadata || {};

    const primary = similarUsers.length > 0
      ? `Users with similar interests also liked this event`
      : `This event matches patterns from your activity`;

    const secondary = [];
    const factors = [];
    const personalizedReasons = [];

    if (similarUsers.length > 0) {
      secondary.push(`${similarUsers.length} users with similar preferences attended this event`);
      factors.push({
        factor: 'User Similarity',
        weight: 0.7,
        description: 'Based on users with similar event preferences',
      });
    }

    // Analyze user's past interactions
    const categoryInteractions = userInteractions.filter(i => 
      i.metadata?.eventCategory === eventMetadata.category
    );

    if (categoryInteractions.length > 0) {
      secondary.push(`You've shown interest in ${eventMetadata.category} events`);
      personalizedReasons.push(`You've interacted with ${categoryInteractions.length} similar events`);
      factors.push({
        factor: 'Category Interest',
        weight: 0.5,
        description: `Your engagement with ${eventMetadata.category} events`,
      });
    }

    return {
      primary,
      secondary,
      factors,
      confidence: Math.min(0.95, 0.3 + (similarUsers.length * 0.1) + (categoryInteractions.length * 0.05)),
      personalizedReasons,
    };
  }

  private async generateContentBasedExplanation(
    context: ExplanationContext,
    userPreferences: UserPreference[],
    userInteractions: UserInteraction[],
  ): Promise<RecommendationExplanation> {
    const eventMetadata = context.eventMetadata || {};
    const features = context.features || {};

    const primary = `This event matches your preferences`;
    const secondary = [];
    const factors = [];
    const personalizedReasons = [];

    // Check category preferences
    const categoryPref = userPreferences.find(p => 
      p.preferenceType === 'categories' && 
      Array.isArray(p.preferenceValue) && 
      p.preferenceValue.includes(eventMetadata.category)
    );

    if (categoryPref) {
      secondary.push(`You prefer ${eventMetadata.category} events`);
      personalizedReasons.push(`${eventMetadata.category} is one of your favorite categories`);
      factors.push({
        factor: 'Category Match',
        weight: categoryPref.weight,
        description: `Strong preference for ${eventMetadata.category} events`,
      });
    }

    // Check location preferences
    const locationPref = userPreferences.find(p => 
      p.preferenceType === 'locations' && 
      Array.isArray(p.preferenceValue) && 
      p.preferenceValue.includes(eventMetadata.location)
    );

    if (locationPref) {
      secondary.push(`This event is in your preferred location`);
      personalizedReasons.push(`${eventMetadata.location} is one of your preferred locations`);
      factors.push({
        factor: 'Location Match',
        weight: locationPref.weight,
        description: `Event location matches your preferences`,
      });
    }

    // Check price preferences
    const pricePref = userPreferences.find(p => p.preferenceType === 'price_range');
    if (pricePref && eventMetadata.price) {
      const priceRange = pricePref.preferenceValue as { min: number; max: number };
      if (eventMetadata.price >= priceRange.min && eventMetadata.price <= priceRange.max) {
        secondary.push(`Price fits your budget`);
        personalizedReasons.push(`Event price (${eventMetadata.price}) is within your preferred range`);
        factors.push({
          factor: 'Price Match',
          weight: pricePref.weight,
          description: `Event price matches your budget preferences`,
        });
      }
    }

    // Check time preferences
    const timePref = userPreferences.find(p => p.preferenceType === 'event_times');
    if (timePref && eventMetadata.startDate) {
      const eventTime = new Date(eventMetadata.startDate).getHours();
      const preferredTimes = timePref.preferenceValue as string[];
      
      const timeMatch = preferredTimes.some(time => {
        const [start, end] = time.split('-').map(t => parseInt(t));
        return eventTime >= start && eventTime <= end;
      });

      if (timeMatch) {
        secondary.push(`Event time matches your schedule`);
        personalizedReasons.push(`Event timing aligns with your preferences`);
        factors.push({
          factor: 'Time Match',
          weight: timePref.weight,
          description: `Event timing matches your preferred schedule`,
        });
      }
    }

    const confidence = factors.reduce((sum, f) => sum + f.weight, 0) / factors.length || 0.5;

    return {
      primary,
      secondary,
      factors,
      confidence: Math.min(0.95, confidence),
      personalizedReasons,
    };
  }

  private async generateHybridExplanation(
    context: ExplanationContext,
    userPreferences: UserPreference[],
    userInteractions: UserInteraction[],
  ): Promise<RecommendationExplanation> {
    // Combine collaborative and content-based explanations
    const collaborativeExp = await this.generateCollaborativeExplanation(
      context,
      userPreferences,
      userInteractions,
    );
    
    const contentBasedExp = await this.generateContentBasedExplanation(
      context,
      userPreferences,
      userInteractions,
    );

    return {
      primary: `This event matches both your preferences and similar users' interests`,
      secondary: [
        ...collaborativeExp.secondary.slice(0, 2),
        ...contentBasedExp.secondary.slice(0, 2),
      ],
      factors: [
        ...collaborativeExp.factors,
        ...contentBasedExp.factors,
      ].sort((a, b) => b.weight - a.weight).slice(0, 5),
      confidence: (collaborativeExp.confidence + contentBasedExp.confidence) / 2,
      personalizedReasons: [
        ...collaborativeExp.personalizedReasons,
        ...contentBasedExp.personalizedReasons,
      ].slice(0, 4),
    };
  }

  private async generateTrendingExplanation(
    context: ExplanationContext,
    userPreferences: UserPreference[],
  ): Promise<RecommendationExplanation> {
    const eventMetadata = context.eventMetadata || {};

    return {
      primary: `This event is trending and popular right now`,
      secondary: [
        `High engagement from other users`,
        `Growing interest in ${eventMetadata.category || 'this type of'} events`,
        `Recent surge in ticket sales`,
      ],
      factors: [
        {
          factor: 'Trending Score',
          weight: 0.8,
          description: 'High current popularity and engagement',
        },
        {
          factor: 'Recent Activity',
          weight: 0.6,
          description: 'Increased user interest and interactions',
        },
      ],
      confidence: 0.75,
      personalizedReasons: [
        `Popular events in your area`,
        `Trending in ${eventMetadata.category || 'entertainment'}`,
      ],
    };
  }

  private async generateLocationExplanation(
    context: ExplanationContext,
    userPreferences: UserPreference[],
  ): Promise<RecommendationExplanation> {
    const eventMetadata = context.eventMetadata || {};

    return {
      primary: `This event is conveniently located near you`,
      secondary: [
        `Event is within your preferred distance`,
        `Located in ${eventMetadata.location || 'your area'}`,
        `Easy to reach from your location`,
      ],
      factors: [
        {
          factor: 'Distance',
          weight: 0.7,
          description: 'Event location proximity to you',
        },
        {
          factor: 'Location Preference',
          weight: 0.5,
          description: 'Matches your location preferences',
        },
      ],
      confidence: 0.8,
      personalizedReasons: [
        `Close to your location`,
        `In your preferred area`,
      ],
    };
  }

  private async generateGenericExplanation(
    context: ExplanationContext,
    userPreferences: UserPreference[],
  ): Promise<RecommendationExplanation> {
    return {
      primary: `This event might interest you`,
      secondary: [
        `Based on your activity patterns`,
        `Popular among users like you`,
        `Matches general preferences`,
      ],
      factors: [
        {
          factor: 'General Interest',
          weight: 0.5,
          description: 'Based on general user patterns',
        },
      ],
      confidence: 0.6,
      personalizedReasons: [
        `Recommended based on your profile`,
      ],
    };
  }

  private async getUserPreferences(userId: string): Promise<UserPreference[]> {
    return this.userPreferenceRepository.find({
      where: { userId },
      order: { weight: 'DESC' },
    });
  }

  private async getRecentInteractions(userId: string, limit: number = 20): Promise<UserInteraction[]> {
    return this.userInteractionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async explainRecommendation(recommendationId: string): Promise<RecommendationExplanation> {
    const recommendation = await this.recommendationRepository.findOne({
      where: { id: recommendationId },
      relations: ['user', 'event'],
    });

    if (!recommendation) {
      throw new Error('Recommendation not found');
    }

    const context: ExplanationContext = {
      userId: recommendation.userId,
      eventId: recommendation.eventId,
      algorithm: recommendation.algorithm,
      score: recommendation.score,
      features: recommendation.metadata?.features,
      similarUsers: recommendation.metadata?.similarUsers,
      eventMetadata: recommendation.metadata?.eventMetadata,
    };

    return this.generateExplanation(context);
  }

  async generateBulkExplanations(recommendationIds: string[]): Promise<Record<string, RecommendationExplanation>> {
    const explanations: Record<string, RecommendationExplanation> = {};

    for (const id of recommendationIds) {
      try {
        explanations[id] = await this.explainRecommendation(id);
      } catch (error) {
        console.error(`Failed to generate explanation for recommendation ${id}:`, error);
      }
    }

    return explanations;
  }

  async getExplanationTemplate(algorithm: string): Promise<any> {
    const templates = {
      collaborative: {
        primaryTemplate: 'Users with similar interests also liked this event',
        factorTypes: ['user_similarity', 'category_interest', 'interaction_patterns'],
        confidenceThresholds: { high: 0.8, medium: 0.6, low: 0.4 },
      },
      content_based: {
        primaryTemplate: 'This event matches your preferences',
        factorTypes: ['category_match', 'location_match', 'price_match', 'time_match'],
        confidenceThresholds: { high: 0.85, medium: 0.65, low: 0.45 },
      },
      hybrid: {
        primaryTemplate: 'This event matches both your preferences and similar users\' interests',
        factorTypes: ['user_similarity', 'content_match', 'interaction_patterns'],
        confidenceThresholds: { high: 0.9, medium: 0.7, low: 0.5 },
      },
      trending: {
        primaryTemplate: 'This event is trending and popular right now',
        factorTypes: ['popularity', 'recent_activity', 'engagement'],
        confidenceThresholds: { high: 0.75, medium: 0.55, low: 0.35 },
      },
      location: {
        primaryTemplate: 'This event is conveniently located near you',
        factorTypes: ['distance', 'location_preference', 'accessibility'],
        confidenceThresholds: { high: 0.8, medium: 0.6, low: 0.4 },
      },
    };

    return templates[algorithm] || templates.content_based;
  }
}
