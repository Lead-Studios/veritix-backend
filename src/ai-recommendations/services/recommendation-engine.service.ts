import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recommendation, RecommendationStatus, RecommendationReason } from '../entities/recommendation.entity';
import { RecommendationModel, ModelType } from '../entities/recommendation-model.entity';
import { Event } from '../../events/entities/event.entity';
import { CollaborativeFilteringService } from './collaborative-filtering.service';
import { ContentBasedFilteringService } from './content-based-filtering.service';
import { MLTrainingService } from './ml-training.service';
import * as tf from '@tensorflow/tfjs-node';

export interface RecommendationRequest {
  userId: string;
  limit?: number;
  context?: string;
  filters?: Record<string, any>;
  excludeEventIds?: string[];
  includeExplanations?: boolean;
}

export interface RecommendationResponse {
  eventId: string;
  event?: Event;
  score: number;
  confidence: number;
  reasons: RecommendationReason[];
  explanation?: Record<string, any>;
  rank: number;
}

@Injectable()
export class RecommendationEngineService {
  constructor(
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
    @InjectRepository(RecommendationModel)
    private modelRepository: Repository<RecommendationModel>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    private collaborativeService: CollaborativeFilteringService,
    private contentBasedService: ContentBasedFilteringService,
    private mlTrainingService: MLTrainingService,
  ) {}

  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse[]> {
    const { userId, limit = 10, context, filters, excludeEventIds = [], includeExplanations = false } = request;

    // Get active models
    const hybridModel = await this.mlTrainingService.getActiveModel(ModelType.HYBRID);
    const collaborativeModel = await this.mlTrainingService.getActiveModel(ModelType.COLLABORATIVE_FILTERING);
    const contentModel = await this.mlTrainingService.getActiveModel(ModelType.CONTENT_BASED);

    let recommendations: RecommendationResponse[] = [];

    if (hybridModel) {
      // Use hybrid ML model for recommendations
      recommendations = await this.getMLRecommendations(userId, hybridModel, limit * 2);
    } else {
      // Fallback to algorithmic approaches
      const collaborativeRecs = await this.collaborativeService.generateRecommendations(userId, limit);
      const contentRecs = await this.contentBasedService.generateRecommendations(userId, limit);
      
      recommendations = await this.combineRecommendations(collaborativeRecs, contentRecs, limit);
    }

    // Apply filters
    if (filters) {
      recommendations = await this.applyFilters(recommendations, filters);
    }

    // Exclude specified events
    if (excludeEventIds.length > 0) {
      recommendations = recommendations.filter(rec => !excludeEventIds.includes(rec.eventId));
    }

    // Add explanations if requested
    if (includeExplanations) {
      recommendations = await this.addExplanations(recommendations, userId);
    }

    // Load event details
    recommendations = await this.loadEventDetails(recommendations);

    // Save recommendations for tracking
    await this.saveRecommendations(userId, recommendations, context);

    return recommendations.slice(0, limit);
  }

  private async getMLRecommendations(
    userId: string,
    model: RecommendationModel,
    limit: number,
  ): Promise<RecommendationResponse[]> {
    // Load the trained model
    const tfModel = await this.mlTrainingService.loadModel(model.modelPath);

    // Get candidate events
    const candidateEvents = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.status = :status', { status: 'PUBLISHED' })
      .andWhere('event.isArchived = :archived', { archived: false })
      .limit(500)
      .getMany();

    const recommendations: RecommendationResponse[] = [];

    // Generate predictions for each candidate event
    for (const event of candidateEvents) {
      try {
        const features = await this.extractHybridFeatures(userId, event.id);
        const featureTensor = tf.tensor2d([features]);
        
        const prediction = tfModel.predict(featureTensor) as tf.Tensor;
        const score = await prediction.data().then(d => d[0]);

        if (score > 0.3) {
          recommendations.push({
            eventId: event.id,
            score,
            confidence: score,
            reasons: [RecommendationReason.PAST_BEHAVIOR],
            rank: 0,
          });
        }

        // Cleanup tensors
        featureTensor.dispose();
        prediction.dispose();
      } catch (error) {
        console.error(`Error generating prediction for event ${event.id}:`, error);
      }
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((rec, index) => ({ ...rec, rank: index + 1 }));
  }

  private async extractHybridFeatures(userId: string, eventId: string): Promise<number[]> {
    // Combine collaborative and content-based features
    const collaborativeFeatures = await this.extractCollaborativeFeatures(userId, eventId);
    const contentFeatures = await this.extractContentFeatures(userId, eventId);
    
    return [...collaborativeFeatures, ...contentFeatures];
  }

  private async extractCollaborativeFeatures(userId: string, eventId: string): Promise<number[]> {
    // Similar to ML training service but for inference
    const features: number[] = [];

    // User activity level
    const userInteractionCount = await this.recommendationRepository
      .createQueryBuilder('rec')
      .where('rec.userId = :userId', { userId })
      .getCount();
    features.push(Math.log(userInteractionCount + 1));

    // Event popularity
    const eventInteractionCount = await this.recommendationRepository
      .createQueryBuilder('rec')
      .where('rec.eventId = :eventId', { eventId })
      .getCount();
    features.push(Math.log(eventInteractionCount + 1));

    // User-event similarity (placeholder)
    features.push(0.5);

    return features;
  }

  private async extractContentFeatures(userId: string, eventId: string): Promise<number[]> {
    // Extract content features for inference
    const features = new Array(20).fill(0);
    
    // This would extract actual event features and user preferences
    // For now, return placeholder features
    return features;
  }

  private async combineRecommendations(
    collaborativeRecs: any[],
    contentRecs: any[],
    limit: number,
  ): Promise<RecommendationResponse[]> {
    const combined = new Map<string, RecommendationResponse>();

    // Add collaborative recommendations
    for (const rec of collaborativeRecs) {
      combined.set(rec.eventId, {
        eventId: rec.eventId,
        score: rec.score * 0.6, // Weight collaborative filtering
        confidence: rec.confidence,
        reasons: rec.reasons,
        rank: 0,
      });
    }

    // Add content-based recommendations
    for (const rec of contentRecs) {
      const existing = combined.get(rec.eventId);
      if (existing) {
        // Combine scores
        existing.score = existing.score + (rec.score * 0.4);
        existing.confidence = Math.max(existing.confidence, rec.confidence);
        existing.reasons = [...new Set([...existing.reasons, ...rec.reasons])];
      } else {
        combined.set(rec.eventId, {
          eventId: rec.eventId,
          score: rec.score * 0.4, // Weight content-based filtering
          confidence: rec.confidence,
          reasons: rec.reasons,
          rank: 0,
        });
      }
    }

    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((rec, index) => ({ ...rec, rank: index + 1 }));
  }

  private async applyFilters(
    recommendations: RecommendationResponse[],
    filters: Record<string, any>,
  ): Promise<RecommendationResponse[]> {
    if (!filters || Object.keys(filters).length === 0) {
      return recommendations;
    }

    const eventIds = recommendations.map(rec => rec.eventId);
    const events = await this.eventRepository.findByIds(eventIds);
    const eventMap = new Map(events.map(event => [event.id, event]));

    return recommendations.filter(rec => {
      const event = eventMap.get(rec.eventId);
      if (!event) return false;

      // Apply location filter
      if (filters.location && !event.state.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }

      // Apply date filter
      if (filters.dateRange) {
        // Would check event date against filter
      }

      // Apply price filter
      if (filters.priceRange) {
        // Would check ticket prices against filter
      }

      return true;
    });
  }

  private async addExplanations(
    recommendations: RecommendationResponse[],
    userId: string,
  ): Promise<RecommendationResponse[]> {
    for (const rec of recommendations) {
      rec.explanation = {
        primaryReason: rec.reasons[0],
        confidence: rec.confidence,
        factors: this.generateExplanationFactors(rec.reasons),
        userProfile: await this.getUserProfileSummary(userId),
      };
    }

    return recommendations;
  }

  private generateExplanationFactors(reasons: RecommendationReason[]): string[] {
    const factors: string[] = [];

    for (const reason of reasons) {
      switch (reason) {
        case RecommendationReason.SIMILAR_USERS:
          factors.push('Users with similar interests also liked this event');
          break;
        case RecommendationReason.PAST_BEHAVIOR:
          factors.push('Based on your previous event preferences');
          break;
        case RecommendationReason.CATEGORY_PREFERENCE:
          factors.push('Matches your preferred event categories');
          break;
        case RecommendationReason.LOCATION_BASED:
          factors.push('Located in your preferred area');
          break;
        case RecommendationReason.POPULAR:
          factors.push('Popular among other users');
          break;
        case RecommendationReason.TRENDING:
          factors.push('Currently trending');
          break;
      }
    }

    return factors;
  }

  private async getUserProfileSummary(userId: string): Promise<Record<string, any>> {
    // Return summary of user preferences for explanation
    return {
      topCategories: ['Music', 'Technology'],
      preferredLocations: ['San Francisco', 'New York'],
      priceRange: 'Medium',
      activityLevel: 'High',
    };
  }

  private async loadEventDetails(
    recommendations: RecommendationResponse[],
  ): Promise<RecommendationResponse[]> {
    const eventIds = recommendations.map(rec => rec.eventId);
    const events = await this.eventRepository.findByIds(eventIds);
    const eventMap = new Map(events.map(event => [event.id, event]));

    return recommendations.map(rec => ({
      ...rec,
      event: eventMap.get(rec.eventId),
    }));
  }

  private async saveRecommendations(
    userId: string,
    recommendations: RecommendationResponse[],
    context?: string,
  ): Promise<void> {
    const activeModel = await this.mlTrainingService.getActiveModel();
    
    const entities = recommendations.map(rec => 
      this.recommendationRepository.create({
        userId,
        eventId: rec.eventId,
        modelId: activeModel?.id || 'fallback',
        score: rec.score,
        confidence: rec.confidence,
        status: RecommendationStatus.GENERATED,
        reasons: rec.reasons,
        rank: rec.rank,
        explanation: rec.explanation,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      })
    );

    await this.recommendationRepository.save(entities);
  }

  async trackRecommendationInteraction(
    recommendationId: string,
    interactionType: 'view' | 'click' | 'purchase' | 'dismiss',
  ): Promise<void> {
    const updates: Partial<Recommendation> = {};
    const now = new Date();

    switch (interactionType) {
      case 'view':
        updates.status = RecommendationStatus.VIEWED;
        updates.viewedAt = now;
        break;
      case 'click':
        updates.status = RecommendationStatus.CLICKED;
        updates.clickedAt = now;
        break;
      case 'purchase':
        updates.status = RecommendationStatus.PURCHASED;
        updates.purchasedAt = now;
        break;
      case 'dismiss':
        updates.status = RecommendationStatus.DISMISSED;
        updates.dismissedAt = now;
        break;
    }

    await this.recommendationRepository.update(recommendationId, updates);
  }

  async getRecommendationPerformance(
    modelId?: string,
    days = 30,
  ): Promise<Record<string, any>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = this.recommendationRepository
      .createQueryBuilder('rec')
      .where('rec.createdAt >= :startDate', { startDate });

    if (modelId) {
      query.andWhere('rec.modelId = :modelId', { modelId });
    }

    const recommendations = await query.getMany();

    const total = recommendations.length;
    const viewed = recommendations.filter(r => r.status === RecommendationStatus.VIEWED).length;
    const clicked = recommendations.filter(r => r.status === RecommendationStatus.CLICKED).length;
    const purchased = recommendations.filter(r => r.status === RecommendationStatus.PURCHASED).length;
    const dismissed = recommendations.filter(r => r.status === RecommendationStatus.DISMISSED).length;

    return {
      totalRecommendations: total,
      viewRate: total > 0 ? viewed / total : 0,
      clickThroughRate: total > 0 ? clicked / total : 0,
      conversionRate: total > 0 ? purchased / total : 0,
      dismissalRate: total > 0 ? dismissed / total : 0,
      averageScore: recommendations.reduce((sum, r) => sum + r.score, 0) / total,
      averageConfidence: recommendations.reduce((sum, r) => sum + r.confidence, 0) / total,
      period: `${days} days`,
    };
  }

  async refreshUserRecommendations(userId: string): Promise<RecommendationResponse[]> {
    // Clear old recommendations
    await this.recommendationRepository.delete({
      userId,
      status: RecommendationStatus.GENERATED,
    });

    // Generate fresh recommendations
    return this.getRecommendations({ userId, limit: 20 });
  }

  async getPersonalizedHomepageRecommendations(userId: string): Promise<RecommendationResponse[]> {
    return this.getRecommendations({
      userId,
      limit: 6,
      context: 'homepage',
      includeExplanations: true,
    });
  }

  async getSimilarEventRecommendations(
    userId: string,
    eventId: string,
  ): Promise<RecommendationResponse[]> {
    // Get events similar to the specified event
    const targetEvent = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!targetEvent) return [];

    const filters = {
      location: targetEvent.state,
      // Would add more similarity filters based on event features
    };

    return this.getRecommendations({
      userId,
      limit: 8,
      context: 'similar_events',
      filters,
      excludeEventIds: [eventId],
    });
  }

  async getCategoryRecommendations(
    userId: string,
    category: string,
  ): Promise<RecommendationResponse[]> {
    const filters = { category };

    return this.getRecommendations({
      userId,
      limit: 12,
      context: 'category_browse',
      filters,
    });
  }

  async getTrendingRecommendations(userId: string): Promise<RecommendationResponse[]> {
    // Get trending events based on recent interaction patterns
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trendingEvents = await this.recommendationRepository
      .createQueryBuilder('rec')
      .select('rec.eventId', 'eventId')
      .addSelect('COUNT(*)', 'interactionCount')
      .addSelect('AVG(rec.score)', 'avgScore')
      .where('rec.createdAt >= :date', { date: sevenDaysAgo })
      .andWhere('rec.status IN (:...statuses)', { 
        statuses: [RecommendationStatus.VIEWED, RecommendationStatus.CLICKED, RecommendationStatus.PURCHASED] 
      })
      .groupBy('rec.eventId')
      .orderBy('interactionCount', 'DESC')
      .addOrderBy('avgScore', 'DESC')
      .limit(10)
      .getRawMany();

    const recommendations: RecommendationResponse[] = trendingEvents.map((item, index) => ({
      eventId: item.eventId,
      score: parseFloat(item.avgScore),
      confidence: 0.8,
      reasons: [RecommendationReason.TRENDING],
      rank: index + 1,
    }));

    return this.loadEventDetails(recommendations);
  }

  async getLocationBasedRecommendations(
    userId: string,
    latitude: number,
    longitude: number,
    radiusKm = 50,
  ): Promise<RecommendationResponse[]> {
    // This would use geospatial queries to find nearby events
    // For now, return recommendations based on user's preferred locations
    
    return this.getRecommendations({
      userId,
      limit: 10,
      context: 'location_based',
      filters: { nearbyLocation: { latitude, longitude, radiusKm } },
    });
  }

  async warmupRecommendations(userId: string): Promise<void> {
    // Pre-generate recommendations for faster response times
    const recommendations = await this.getRecommendations({ userId, limit: 20 });
    
    // Cache would be implemented here
    console.log(`Warmed up ${recommendations.length} recommendations for user ${userId}`);
  }

  async cleanupExpiredRecommendations(): Promise<void> {
    const now = new Date();
    
    await this.recommendationRepository
      .createQueryBuilder()
      .update(Recommendation)
      .set({ status: RecommendationStatus.EXPIRED })
      .where('expiresAt < :now', { now })
      .andWhere('status = :status', { status: RecommendationStatus.GENERATED })
      .execute();
  }
}
