import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserInteraction, InteractionType } from '../entities/user-interaction.entity';
import { Recommendation, RecommendationReason } from '../entities/recommendation.entity';
import { Event } from '../../events/entities/event.entity';

export interface SimilarUser {
  userId: string;
  similarity: number;
  commonInteractions: number;
}

export interface CollaborativeRecommendation {
  eventId: string;
  score: number;
  reasons: RecommendationReason[];
  similarUsers: string[];
  confidence: number;
}

@Injectable()
export class CollaborativeFilteringService {
  constructor(
    @InjectRepository(UserInteraction)
    private interactionRepository: Repository<UserInteraction>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async generateRecommendations(
    userId: string,
    limit = 10,
  ): Promise<CollaborativeRecommendation[]> {
    // Find similar users based on interaction patterns
    const similarUsers = await this.findSimilarUsers(userId, 50);
    
    if (similarUsers.length === 0) {
      return this.getFallbackRecommendations(userId, limit);
    }

    // Get events that similar users interacted with but target user hasn't
    const recommendations = await this.getRecommendationsFromSimilarUsers(
      userId,
      similarUsers,
      limit,
    );

    return recommendations;
  }

  async findSimilarUsers(userId: string, limit = 50): Promise<SimilarUser[]> {
    // Get user's interaction history
    const userInteractions = await this.getUserInteractionVector(userId);
    
    if (userInteractions.length === 0) {
      return [];
    }

    // Get all other users who have interacted with similar events
    const eventIds = userInteractions.map(i => i.eventId).filter(Boolean);
    
    const otherUsers = await this.interactionRepository
      .createQueryBuilder('interaction')
      .select('interaction.userId', 'userId')
      .addSelect('COUNT(DISTINCT interaction.eventId)', 'commonEvents')
      .where('interaction.eventId IN (:...eventIds)', { eventIds })
      .andWhere('interaction.userId != :userId', { userId })
      .groupBy('interaction.userId')
      .having('COUNT(DISTINCT interaction.eventId) >= :minCommon', { minCommon: 2 })
      .orderBy('commonEvents', 'DESC')
      .limit(limit * 2)
      .getRawMany();

    // Calculate similarity scores
    const similarities: SimilarUser[] = [];
    
    for (const otherUser of otherUsers) {
      const otherUserInteractions = await this.getUserInteractionVector(otherUser.userId);
      const similarity = this.calculateCosineSimilarity(userInteractions, otherUserInteractions);
      
      if (similarity > 0.1) {
        similarities.push({
          userId: otherUser.userId,
          similarity,
          commonInteractions: parseInt(otherUser.commonEvents),
        });
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private async getUserInteractionVector(userId: string): Promise<Array<{ eventId: string; score: number }>> {
    const interactions = await this.interactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 500, // Limit to recent interactions
    });

    // Aggregate interactions by event
    const eventScores = new Map<string, number>();
    
    for (const interaction of interactions) {
      if (!interaction.eventId) continue;
      
      const currentScore = eventScores.get(interaction.eventId) || 0;
      eventScores.set(interaction.eventId, currentScore + interaction.weight);
    }

    return Array.from(eventScores.entries()).map(([eventId, score]) => ({
      eventId,
      score,
    }));
  }

  private calculateCosineSimilarity(
    vectorA: Array<{ eventId: string; score: number }>,
    vectorB: Array<{ eventId: string; score: number }>,
  ): number {
    const mapA = new Map(vectorA.map(item => [item.eventId, item.score]));
    const mapB = new Map(vectorB.map(item => [item.eventId, item.score]));

    const commonEvents = [...mapA.keys()].filter(eventId => mapB.has(eventId));
    
    if (commonEvents.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const eventId of commonEvents) {
      const scoreA = mapA.get(eventId) || 0;
      const scoreB = mapB.get(eventId) || 0;
      
      dotProduct += scoreA * scoreB;
      normA += scoreA * scoreA;
      normB += scoreB * scoreB;
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async getRecommendationsFromSimilarUsers(
    userId: string,
    similarUsers: SimilarUser[],
    limit: number,
  ): Promise<CollaborativeRecommendation[]> {
    // Get events user hasn't interacted with
    const userEventIds = await this.interactionRepository
      .createQueryBuilder('interaction')
      .select('DISTINCT interaction.eventId')
      .where('interaction.userId = :userId', { userId })
      .andWhere('interaction.eventId IS NOT NULL')
      .getRawMany()
      .then(results => results.map(r => r.eventId));

    // Get events similar users liked
    const similarUserIds = similarUsers.map(u => u.userId);
    
    const candidateEvents = await this.interactionRepository
      .createQueryBuilder('interaction')
      .select('interaction.eventId', 'eventId')
      .addSelect('COUNT(*)', 'interactionCount')
      .addSelect('AVG(interaction.weight)', 'avgWeight')
      .addSelect('GROUP_CONCAT(DISTINCT interaction.userId)', 'userIds')
      .where('interaction.userId IN (:...userIds)', { userIds: similarUserIds })
      .andWhere('interaction.eventId IS NOT NULL')
      .andWhere('interaction.eventId NOT IN (:...excludeIds)', { 
        excludeIds: userEventIds.length > 0 ? userEventIds : [''] 
      })
      .andWhere('interaction.weight > 0')
      .groupBy('interaction.eventId')
      .having('COUNT(*) >= :minInteractions', { minInteractions: 2 })
      .orderBy('avgWeight', 'DESC')
      .addOrderBy('interactionCount', 'DESC')
      .limit(limit * 2)
      .getRawMany();

    // Calculate recommendation scores
    const recommendations: CollaborativeRecommendation[] = [];

    for (const candidate of candidateEvents) {
      const contributingUsers = candidate.userIds.split(',');
      const score = this.calculateCollaborativeScore(
        contributingUsers,
        similarUsers,
        parseFloat(candidate.avgWeight),
        parseInt(candidate.interactionCount),
      );

      if (score > 0.1) {
        recommendations.push({
          eventId: candidate.eventId,
          score,
          reasons: [RecommendationReason.SIMILAR_USERS],
          similarUsers: contributingUsers,
          confidence: Math.min(score, 1.0),
        });
      }
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private calculateCollaborativeScore(
    contributingUsers: string[],
    similarUsers: SimilarUser[],
    avgWeight: number,
    interactionCount: number,
  ): number {
    const similarityMap = new Map(similarUsers.map(u => [u.userId, u.similarity]));
    
    let weightedSimilarity = 0;
    let totalSimilarity = 0;

    for (const userId of contributingUsers) {
      const similarity = similarityMap.get(userId) || 0;
      weightedSimilarity += similarity * avgWeight;
      totalSimilarity += similarity;
    }

    if (totalSimilarity === 0) return 0;

    const baseScore = weightedSimilarity / totalSimilarity;
    const popularityBoost = Math.log(interactionCount + 1) / 10;
    
    return Math.min(baseScore + popularityBoost, 1.0);
  }

  private async getFallbackRecommendations(
    userId: string,
    limit: number,
  ): Promise<CollaborativeRecommendation[]> {
    // Return popular events as fallback
    const popularEvents = await this.interactionRepository
      .createQueryBuilder('interaction')
      .select('interaction.eventId', 'eventId')
      .addSelect('COUNT(*)', 'interactionCount')
      .addSelect('AVG(interaction.weight)', 'avgWeight')
      .where('interaction.eventId IS NOT NULL')
      .andWhere('interaction.weight > 0')
      .andWhere('interaction.createdAt >= :date', { 
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
      })
      .groupBy('interaction.eventId')
      .orderBy('interactionCount', 'DESC')
      .addOrderBy('avgWeight', 'DESC')
      .limit(limit)
      .getRawMany();

    return popularEvents.map(event => ({
      eventId: event.eventId,
      score: Math.min(parseFloat(event.avgWeight) / 10, 1.0),
      reasons: [RecommendationReason.POPULAR],
      similarUsers: [],
      confidence: 0.5,
    }));
  }

  async updateUserSimilarityMatrix(): Promise<void> {
    // This would be run periodically to update user similarity scores
    // For now, we calculate similarities on-demand
    console.log('User similarity matrix update scheduled');
  }
}
