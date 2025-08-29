import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SentimentType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  MIXED = 'mixed',
}

export enum SocialPlatform {
  TWITTER = 'twitter',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  LINKEDIN = 'linkedin',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  REDDIT = 'reddit',
  BLOG = 'blog',
  NEWS = 'news',
  REVIEW = 'review',
}

export enum ContentType {
  POST = 'post',
  COMMENT = 'comment',
  REVIEW = 'review',
  MENTION = 'mention',
  HASHTAG = 'hashtag',
  STORY = 'story',
  VIDEO = 'video',
  ARTICLE = 'article',
}

@Entity('sentiment_analysis')
@Index(['eventId', 'platform', 'timestamp'])
@Index(['timestamp'])
@Index(['sentimentType'])
@Index(['platform'])
export class SentimentAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  eventId: string;

  @Column({
    type: 'enum',
    enum: SocialPlatform,
  })
  @Index()
  platform: SocialPlatform;

  @Column({ type: 'timestamp' })
  @Index()
  timestamp: Date;

  @Column({
    type: 'enum',
    enum: SentimentType,
  })
  @Index()
  sentimentType: SentimentType;

  @Column({ type: 'decimal', precision: 5, scale: 3 })
  sentimentScore: number; // -1.0 to 1.0

  @Column({ type: 'decimal', precision: 5, scale: 3 })
  confidenceScore: number; // 0.0 to 1.0

  @Column({ type: 'json' })
  overallMetrics: {
    totalMentions: number;
    totalReach: number;
    totalEngagement: number;
    averageSentiment: number;
    sentimentDistribution: {
      positive: number;
      negative: number;
      neutral: number;
      mixed: number;
    };
    viralityScore: number;
    trendingScore: number;
    influenceScore: number;
  };

  @Column({ type: 'json' })
  platformBreakdown: Array<{
    platform: SocialPlatform;
    mentions: number;
    reach: number;
    engagement: number;
    sentiment: number;
    confidence: number;
    growth: number;
    topPosts: Array<{
      id: string;
      content: string;
      author: string;
      followers: number;
      engagement: number;
      sentiment: number;
      url: string;
    }>;
  }>;

  @Column({ type: 'json' })
  keywordAnalysis: {
    positiveKeywords: Array<{
      keyword: string;
      frequency: number;
      sentiment: number;
      context: string[];
    }>;
    negativeKeywords: Array<{
      keyword: string;
      frequency: number;
      sentiment: number;
      context: string[];
    }>;
    emergingKeywords: Array<{
      keyword: string;
      frequency: number;
      growth: number;
      sentiment: number;
    }>;
    brandMentions: Array<{
      brand: string;
      mentions: number;
      sentiment: number;
      context: 'competitor' | 'partner' | 'sponsor' | 'venue' | 'artist';
    }>;
  };

  @Column({ type: 'json' })
  influencerAnalysis: {
    topInfluencers: Array<{
      username: string;
      platform: SocialPlatform;
      followers: number;
      engagement: number;
      sentiment: number;
      reach: number;
      posts: number;
      influence: number;
      category: 'micro' | 'macro' | 'mega' | 'celebrity';
    }>;
    influencerSentiment: {
      positive: number;
      negative: number;
      neutral: number;
    };
    potentialPartners: Array<{
      username: string;
      platform: SocialPlatform;
      followers: number;
      engagement: number;
      relevance: number;
      cost: number;
    }>;
  };

  @Column({ type: 'json' })
  emotionAnalysis: {
    emotions: Array<{
      emotion: 'joy' | 'anger' | 'fear' | 'sadness' | 'surprise' | 'disgust' | 'trust' | 'anticipation';
      intensity: number;
      frequency: number;
      context: string[];
    }>;
    dominantEmotion: string;
    emotionalJourney: Array<{
      timestamp: Date;
      emotion: string;
      intensity: number;
      trigger: string;
    }>;
  };

  @Column({ type: 'json' })
  topicAnalysis: {
    topics: Array<{
      topic: string;
      relevance: number;
      sentiment: number;
      mentions: number;
      keywords: string[];
      context: string;
    }>;
    trendingTopics: Array<{
      topic: string;
      growth: number;
      sentiment: number;
      urgency: 'low' | 'medium' | 'high' | 'critical';
    }>;
    controversialTopics: Array<{
      topic: string;
      polarization: number;
      positivePercentage: number;
      negativePercentage: number;
      riskLevel: number;
    }>;
  };

  @Column({ type: 'json' })
  geographicSentiment: {
    regions: Array<{
      country: string;
      region: string;
      city: string;
      mentions: number;
      sentiment: number;
      engagement: number;
      culturalContext: string[];
    }>;
    sentimentHeatmap: Array<{
      latitude: number;
      longitude: number;
      sentiment: number;
      intensity: number;
    }>;
    regionalTrends: Array<{
      region: string;
      trend: string;
      sentiment: number;
      growth: number;
    }>;
  };

  @Column({ type: 'json' })
  temporalAnalysis: {
    hourlyTrends: Array<{
      hour: number;
      mentions: number;
      sentiment: number;
      engagement: number;
    }>;
    dailyTrends: Array<{
      date: Date;
      mentions: number;
      sentiment: number;
      engagement: number;
      events: string[];
    }>;
    sentimentVelocity: number;
    peakSentimentTime: Date;
    lowestSentimentTime: Date;
    volatility: number;
  };

  @Column({ type: 'json' })
  competitorComparison: {
    competitors: Array<{
      name: string;
      mentions: number;
      sentiment: number;
      share: number;
      growth: number;
      strengths: string[];
      weaknesses: string[];
    }>;
    marketPosition: {
      rank: number;
      sentimentRank: number;
      shareOfVoice: number;
      competitiveAdvantage: string[];
    };
  };

  @Column({ type: 'json' })
  alertsAndInsights: {
    criticalAlerts: Array<{
      id: string;
      type: 'sentiment_drop' | 'viral_negative' | 'crisis_emerging' | 'opportunity';
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      timestamp: Date;
      actionRequired: boolean;
      suggestedActions: string[];
    }>;
    insights: Array<{
      insight: string;
      confidence: number;
      impact: 'low' | 'medium' | 'high';
      category: 'opportunity' | 'threat' | 'trend' | 'anomaly';
      actionable: boolean;
    }>;
    recommendations: Array<{
      recommendation: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      expectedImpact: string;
      effort: 'low' | 'medium' | 'high';
      timeline: string;
    }>;
  };

  @Column({ type: 'json' })
  contentAnalysis: {
    contentTypes: Array<{
      type: ContentType;
      count: number;
      avgSentiment: number;
      engagement: number;
      virality: number;
    }>;
    topPerformingContent: Array<{
      id: string;
      type: ContentType;
      platform: SocialPlatform;
      content: string;
      author: string;
      engagement: number;
      sentiment: number;
      reach: number;
      url: string;
    }>;
    contentGaps: Array<{
      gap: string;
      opportunity: string;
      priority: number;
    }>;
  };

  @Column({ type: 'int', default: 0 })
  totalDataPoints: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAnalyzedAt: Date;

  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields
  get sentimentTrend(): 'improving' | 'declining' | 'stable' {
    const velocity = this.temporalAnalysis.sentimentVelocity;
    
    if (velocity > 0.1) return 'improving';
    if (velocity < -0.1) return 'declining';
    return 'stable';
  }

  get overallSentimentRating(): 'excellent' | 'good' | 'average' | 'poor' | 'critical' {
    const score = this.overallMetrics.averageSentiment;
    
    if (score > 0.6) return 'excellent';
    if (score > 0.2) return 'good';
    if (score > -0.2) return 'average';
    if (score > -0.6) return 'poor';
    return 'critical';
  }

  get viralityLevel(): 'viral' | 'trending' | 'growing' | 'stable' | 'declining' {
    const score = this.overallMetrics.viralityScore;
    
    if (score > 0.8) return 'viral';
    if (score > 0.6) return 'trending';
    if (score > 0.4) return 'growing';
    if (score > 0.2) return 'stable';
    return 'declining';
  }

  get riskLevel(): 'low' | 'medium' | 'high' | 'critical' {
    const criticalAlerts = this.alertsAndInsights.criticalAlerts
      .filter(alert => alert.severity === 'critical' || alert.severity === 'high').length;
    
    const negativePercentage = this.overallMetrics.sentimentDistribution.negative;
    
    if (criticalAlerts > 2 || negativePercentage > 60) return 'critical';
    if (criticalAlerts > 1 || negativePercentage > 40) return 'high';
    if (criticalAlerts > 0 || negativePercentage > 25) return 'medium';
    return 'low';
  }

  get topPerformingPlatform(): string {
    if (!this.platformBreakdown.length) return 'none';
    
    return this.platformBreakdown
      .sort((a, b) => (b.engagement * b.sentiment) - (a.engagement * a.sentiment))[0].platform;
  }

  get mostInfluentialMention(): any {
    const allPosts = this.platformBreakdown
      .flatMap(platform => platform.topPosts)
      .sort((a, b) => (b.followers * b.engagement) - (a.followers * a.engagement));
    
    return allPosts[0] || null;
  }

  get sentimentVolatility(): 'high' | 'medium' | 'low' {
    const volatility = this.temporalAnalysis.volatility;
    
    if (volatility > 0.3) return 'high';
    if (volatility > 0.15) return 'medium';
    return 'low';
  }

  get actionRequiredCount(): number {
    return this.alertsAndInsights.criticalAlerts
      .filter(alert => alert.actionRequired).length;
  }

  get opportunityScore(): number {
    let score = 0;
    
    // Positive sentiment weight
    score += this.overallMetrics.sentimentDistribution.positive * 0.3;
    
    // Virality weight
    score += this.overallMetrics.viralityScore * 0.25;
    
    // Influencer engagement weight
    const influencerPositive = this.influencerAnalysis.influencerSentiment.positive;
    score += influencerPositive * 0.25;
    
    // Growth potential weight
    const trendingTopics = this.topicAnalysis.trendingTopics
      .filter(topic => topic.sentiment > 0).length;
    score += (trendingTopics / Math.max(this.topicAnalysis.trendingTopics.length, 1)) * 0.2;
    
    return Math.min(score * 100, 100);
  }

  get competitiveAdvantage(): string[] {
    return this.competitorComparison.marketPosition.competitiveAdvantage || [];
  }

  get emergingThreats(): string[] {
    return this.topicAnalysis.controversialTopics
      .filter(topic => topic.riskLevel > 0.7)
      .map(topic => topic.topic);
  }

  get recommendedActions(): Array<{ action: string; priority: string; impact: string }> {
    return this.alertsAndInsights.recommendations
      .filter(rec => rec.priority === 'high' || rec.priority === 'urgent')
      .map(rec => ({
        action: rec.recommendation,
        priority: rec.priority,
        impact: rec.expectedImpact,
      }));
  }
}
