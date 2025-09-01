import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserInteraction, InteractionType, InteractionContext } from '../entities/user-interaction.entity';
import { UserPreference, PreferenceType, PreferenceSource } from '../entities/user-preference.entity';

export interface TrackInteractionDto {
  userId: string;
  eventId?: string;
  interactionType: InteractionType;
  context?: InteractionContext;
  duration?: number;
  metadata?: Record<string, any>;
  sessionId?: string;
  deviceType?: string;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  searchQuery?: Record<string, any>;
  filterCriteria?: Record<string, any>;
  rating?: number;
  feedback?: string;
}

@Injectable()
export class UserBehaviorTrackingService {
  constructor(
    @InjectRepository(UserInteraction)
    private interactionRepository: Repository<UserInteraction>,
    @InjectRepository(UserPreference)
    private preferenceRepository: Repository<UserPreference>,
  ) {}

  async trackInteraction(data: TrackInteractionDto): Promise<UserInteraction> {
    const interaction = this.interactionRepository.create({
      ...data,
      weight: this.calculateInteractionWeight(data.interactionType),
    });

    const saved = await this.interactionRepository.save(interaction);

    // Update user preferences based on interaction
    await this.updateUserPreferences(data);

    return saved;
  }

  async batchTrackInteractions(interactions: TrackInteractionDto[]): Promise<UserInteraction[]> {
    const entities = interactions.map(data => 
      this.interactionRepository.create({
        ...data,
        weight: this.calculateInteractionWeight(data.interactionType),
      })
    );

    const saved = await this.interactionRepository.save(entities);

    // Update preferences for all interactions
    for (const interaction of interactions) {
      await this.updateUserPreferences(interaction);
    }

    return saved;
  }

  async getUserInteractions(
    userId: string,
    limit = 100,
    interactionType?: InteractionType,
  ): Promise<UserInteraction[]> {
    const query = this.interactionRepository
      .createQueryBuilder('interaction')
      .where('interaction.userId = :userId', { userId })
      .orderBy('interaction.createdAt', 'DESC')
      .limit(limit);

    if (interactionType) {
      query.andWhere('interaction.interactionType = :type', { type: interactionType });
    }

    return query.getMany();
  }

  async getUserPreferences(userId: string): Promise<UserPreference[]> {
    return this.preferenceRepository.find({
      where: { userId, isActive: true },
      order: { weight: 'DESC' },
    });
  }

  async updateUserPreferences(interaction: TrackInteractionDto): Promise<void> {
    if (!interaction.eventId) return;

    // Extract preferences from interaction
    const preferences = await this.extractPreferencesFromInteraction(interaction);

    for (const pref of preferences) {
      await this.upsertPreference(interaction.userId, pref);
    }
  }

  private async extractPreferencesFromInteraction(
    interaction: TrackInteractionDto,
  ): Promise<Array<{ type: PreferenceType; value: string; weight: number }>> {
    const preferences: Array<{ type: PreferenceType; value: string; weight: number }> = [];

    // Extract category preference from search query
    if (interaction.searchQuery?.category) {
      preferences.push({
        type: PreferenceType.CATEGORY,
        value: interaction.searchQuery.category,
        weight: this.calculatePreferenceWeight(interaction.interactionType),
      });
    }

    // Extract location preference
    if (interaction.searchQuery?.location || interaction.filterCriteria?.location) {
      const location = interaction.searchQuery?.location || interaction.filterCriteria?.location;
      preferences.push({
        type: PreferenceType.LOCATION,
        value: location,
        weight: this.calculatePreferenceWeight(interaction.interactionType),
      });
    }

    // Extract price range preference
    if (interaction.filterCriteria?.priceRange) {
      preferences.push({
        type: PreferenceType.PRICE_RANGE,
        value: JSON.stringify(interaction.filterCriteria.priceRange),
        weight: this.calculatePreferenceWeight(interaction.interactionType),
      });
    }

    // Extract time preference
    if (interaction.filterCriteria?.timeRange) {
      preferences.push({
        type: PreferenceType.TIME_PREFERENCE,
        value: JSON.stringify(interaction.filterCriteria.timeRange),
        weight: this.calculatePreferenceWeight(interaction.interactionType),
      });
    }

    return preferences;
  }

  private async upsertPreference(
    userId: string,
    preferenceData: { type: PreferenceType; value: string; weight: number },
  ): Promise<void> {
    const existing = await this.preferenceRepository.findOne({
      where: {
        userId,
        preferenceType: preferenceData.type,
        preferenceValue: preferenceData.value,
      },
    });

    if (existing) {
      // Update existing preference
      const newWeight = (existing.weight + preferenceData.weight) / 2;
      const newFrequency = existing.frequency + 1;
      
      await this.preferenceRepository.update(existing.id, {
        weight: newWeight,
        frequency: newFrequency,
        lastUsed: new Date(),
        confidence: Math.min(existing.confidence + 0.1, 1.0),
      });
    } else {
      // Create new preference
      const preference = this.preferenceRepository.create({
        userId,
        preferenceType: preferenceData.type,
        preferenceValue: preferenceData.value,
        weight: preferenceData.weight,
        confidence: 0.5,
        source: PreferenceSource.IMPLICIT,
        frequency: 1,
        lastUsed: new Date(),
        isActive: true,
      });

      await this.preferenceRepository.save(preference);
    }
  }

  private calculateInteractionWeight(interactionType: InteractionType): number {
    const weights = {
      [InteractionType.VIEW]: 1.0,
      [InteractionType.CLICK]: 2.0,
      [InteractionType.PURCHASE]: 10.0,
      [InteractionType.SHARE]: 3.0,
      [InteractionType.FAVORITE]: 5.0,
      [InteractionType.SEARCH]: 1.5,
      [InteractionType.FILTER]: 1.5,
      [InteractionType.CART_ADD]: 4.0,
      [InteractionType.CART_REMOVE]: -1.0,
      [InteractionType.WISHLIST_ADD]: 3.0,
      [InteractionType.REVIEW]: 6.0,
      [InteractionType.RATING]: 4.0,
    };

    return weights[interactionType] || 1.0;
  }

  private calculatePreferenceWeight(interactionType: InteractionType): number {
    const weights = {
      [InteractionType.VIEW]: 0.1,
      [InteractionType.CLICK]: 0.3,
      [InteractionType.PURCHASE]: 1.0,
      [InteractionType.SHARE]: 0.5,
      [InteractionType.FAVORITE]: 0.7,
      [InteractionType.SEARCH]: 0.2,
      [InteractionType.FILTER]: 0.2,
      [InteractionType.CART_ADD]: 0.6,
      [InteractionType.CART_REMOVE]: -0.1,
      [InteractionType.WISHLIST_ADD]: 0.4,
      [InteractionType.REVIEW]: 0.8,
      [InteractionType.RATING]: 0.6,
    };

    return weights[interactionType] || 0.1;
  }

  async getInteractionStats(userId: string, days = 30): Promise<Record<string, any>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const interactions = await this.interactionRepository
      .createQueryBuilder('interaction')
      .select('interaction.interactionType', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(interaction.weight)', 'avgWeight')
      .where('interaction.userId = :userId', { userId })
      .andWhere('interaction.createdAt >= :startDate', { startDate })
      .groupBy('interaction.interactionType')
      .getRawMany();

    const totalInteractions = interactions.reduce((sum, item) => sum + parseInt(item.count), 0);

    return {
      totalInteractions,
      interactionBreakdown: interactions,
      averageEngagement: interactions.reduce((sum, item) => sum + parseFloat(item.avgWeight), 0) / interactions.length,
      period: `${days} days`,
    };
  }

  async getTopPreferences(userId: string, limit = 10): Promise<UserPreference[]> {
    return this.preferenceRepository.find({
      where: { userId, isActive: true },
      order: { weight: 'DESC', frequency: 'DESC' },
      take: limit,
    });
  }

  async decayPreferences(): Promise<void> {
    // Decay old preferences to keep them relevant
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await this.preferenceRepository
      .createQueryBuilder()
      .update(UserPreference)
      .set({
        weight: () => 'weight * 0.9',
        confidence: () => 'confidence * 0.95',
      })
      .where('lastUsed < :date', { date: thirtyDaysAgo })
      .execute();

    // Deactivate very old preferences
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    await this.preferenceRepository
      .createQueryBuilder()
      .update(UserPreference)
      .set({ isActive: false })
      .where('lastUsed < :date AND weight < :minWeight', {
        date: ninetyDaysAgo,
        minWeight: 0.1,
      })
      .execute();
  }
}
