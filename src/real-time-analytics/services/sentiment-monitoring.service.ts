import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { SentimentAnalysis, SocialPlatform, SentimentType } from '../entities/sentiment-analysis.entity';
import { firstValueFrom } from 'rxjs';

export interface SocialMention {
  id: string;
  platform: SocialPlatform;
  content: string;
  author: string;
  followers: number;
  engagement: number;
  sentiment: number;
  confidence: number;
  timestamp: Date;
  url: string;
  reach: number;
  hashtags: string[];
  mentions: string[];
}

export interface SentimentAlert {
  id: string;
  type: 'sentiment_drop' | 'viral_negative' | 'crisis_emerging' | 'opportunity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  platform: SocialPlatform;
  data: any;
  timestamp: Date;
  actionRequired: boolean;
  suggestedActions: string[];
}

@Injectable()
export class SentimentMonitoringService {
  private readonly logger = new Logger(SentimentMonitoringService.name);
  private readonly apiKeys: Record<string, string>;
  private readonly alertThresholds: Record<string, number>;

  constructor(
    @InjectRepository(SentimentAnalysis)
    private sentimentRepository: Repository<SentimentAnalysis>,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private httpService: HttpService,
  ) {
    this.apiKeys = {
      twitter: this.configService.get<string>('TWITTER_API_KEY'),
      facebook: this.configService.get<string>('FACEBOOK_API_KEY'),
      instagram: this.configService.get<string>('INSTAGRAM_API_KEY'),
      youtube: this.configService.get<string>('YOUTUBE_API_KEY'),
      reddit: this.configService.get<string>('REDDIT_API_KEY'),
      sentiment: this.configService.get<string>('SENTIMENT_API_KEY'),
    };

    this.alertThresholds = {
      sentimentDropThreshold: this.configService.get<number>('SENTIMENT_DROP_THRESHOLD', -0.3),
      viralNegativeThreshold: this.configService.get<number>('VIRAL_NEGATIVE_THRESHOLD', 1000),
      crisisEmergingThreshold: this.configService.get<number>('CRISIS_EMERGING_THRESHOLD', -0.5),
      mentionVolumeSpike: this.configService.get<number>('MENTION_VOLUME_SPIKE', 300),
    };
  }

  async monitorEventSentiment(eventId: string, keywords: string[], hashtags: string[]): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const mentions = await this.collectMentionsFromAllPlatforms(keywords, hashtags);
      const analyzedMentions = await this.analyzeMentionsSentiment(mentions);

      let sentimentAnalysis = await this.sentimentRepository.findOne({
        where: { eventId, platform: SocialPlatform.TWITTER, timestamp: today },
      });

      if (!sentimentAnalysis) {
        sentimentAnalysis = await this.createNewSentimentRecord(eventId, today);
      }

      this.updateSentimentAnalysis(sentimentAnalysis, analyzedMentions);
      const alerts = await this.generateSentimentAlerts(eventId, sentimentAnalysis);

      await this.sentimentRepository.save(sentimentAnalysis);

      this.eventEmitter.emit('sentiment.updated', {
        eventId,
        sentimentAnalysis,
        newMentions: analyzedMentions.length,
        alerts,
      });

      for (const alert of alerts) {
        this.eventEmitter.emit('sentiment.alert', { eventId, alert });
      }

    } catch (error) {
      this.logger.error(`Failed to monitor sentiment for event ${eventId}:`, error);
      throw error;
    }
  }

  async getRealTimeSentiment(eventId: string): Promise<any> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sentimentAnalysis = await this.sentimentRepository.findOne({
        where: { eventId, platform: SocialPlatform.TWITTER, timestamp: today },
      });

      if (!sentimentAnalysis) {
        return this.getEmptySentiment();
      }

      const insights = this.generateSentimentInsights(sentimentAnalysis);
      const trendingTopics = this.identifyTrendingTopics(sentimentAnalysis);
      const topInfluencers = this.identifyTopInfluencers(sentimentAnalysis);

      return {
        sentiment: sentimentAnalysis,
        insights,
        trendingTopics,
        topInfluencers,
        riskLevel: sentimentAnalysis.riskLevel,
        lastUpdated: sentimentAnalysis.lastAnalyzedAt,
      };

    } catch (error) {
      this.logger.error(`Failed to get real-time sentiment for event ${eventId}:`, error);
      throw error;
    }
  }

  private async collectMentionsFromAllPlatforms(keywords: string[], hashtags: string[]): Promise<SocialMention[]> {
    const mentions: SocialMention[] = [];

    const [twitterMentions, facebookMentions, instagramMentions, youtubeMentions, redditMentions] = await Promise.allSettled([
      this.collectTwitterMentions(keywords, hashtags),
      this.collectFacebookMentions(keywords, hashtags),
      this.collectInstagramMentions(keywords, hashtags),
      this.collectYouTubeMentions(keywords),
      this.collectRedditMentions(keywords),
    ]);

    if (twitterMentions.status === 'fulfilled') mentions.push(...twitterMentions.value);
    if (facebookMentions.status === 'fulfilled') mentions.push(...facebookMentions.value);
    if (instagramMentions.status === 'fulfilled') mentions.push(...instagramMentions.value);
    if (youtubeMentions.status === 'fulfilled') mentions.push(...youtubeMentions.value);
    if (redditMentions.status === 'fulfilled') mentions.push(...redditMentions.value);

    return mentions;
  }

  private async collectTwitterMentions(keywords: string[], hashtags: string[]): Promise<SocialMention[]> {
    try {
      if (!this.apiKeys.twitter) return [];

      const query = [...keywords, ...hashtags.map(h => `#${h}`)].join(' OR ');
      
      const response = await firstValueFrom(
        this.httpService.get('https://api.twitter.com/2/tweets/search/recent', {
          headers: { 'Authorization': `Bearer ${this.apiKeys.twitter}` },
          params: {
            query,
            max_results: 100,
            'tweet.fields': 'created_at,author_id,public_metrics',
            'user.fields': 'public_metrics',
            'expansions': 'author_id',
          },
          timeout: 10000,
        })
      );

      return this.parseTwitterResponse(response.data);

    } catch (error) {
      this.logger.error('Failed to collect Twitter mentions:', error);
      return [];
    }
  }

  private async collectFacebookMentions(keywords: string[], hashtags: string[]): Promise<SocialMention[]> {
    try {
      if (!this.apiKeys.facebook) return [];

      const query = keywords.join(' ');
      const response = await firstValueFrom(
        this.httpService.get('https://graph.facebook.com/v18.0/search', {
          params: {
            q: query,
            type: 'post',
            access_token: this.apiKeys.facebook,
            fields: 'message,created_time,from,likes.summary(true),comments.summary(true)',
          },
          timeout: 10000,
        })
      );

      return this.parseFacebookResponse(response.data);

    } catch (error) {
      this.logger.error('Failed to collect Facebook mentions:', error);
      return [];
    }
  }

  private async collectInstagramMentions(keywords: string[], hashtags: string[]): Promise<SocialMention[]> {
    try {
      if (!this.apiKeys.instagram) return [];

      const hashtagQuery = hashtags[0];
      const response = await firstValueFrom(
        this.httpService.get(`https://graph.instagram.com/ig_hashtag_search`, {
          params: {
            user_id: 'me',
            q: hashtagQuery,
            access_token: this.apiKeys.instagram,
          },
          timeout: 10000,
        })
      );

      return this.parseInstagramResponse(response.data);

    } catch (error) {
      this.logger.error('Failed to collect Instagram mentions:', error);
      return [];
    }
  }

  private async collectYouTubeMentions(keywords: string[]): Promise<SocialMention[]> {
    try {
      if (!this.apiKeys.youtube) return [];

      const query = keywords.join(' ');
      const response = await firstValueFrom(
        this.httpService.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'snippet',
            q: query,
            type: 'video',
            order: 'date',
            maxResults: 50,
            key: this.apiKeys.youtube,
          },
          timeout: 10000,
        })
      );

      return this.parseYouTubeResponse(response.data);

    } catch (error) {
      this.logger.error('Failed to collect YouTube mentions:', error);
      return [];
    }
  }

  private async collectRedditMentions(keywords: string[]): Promise<SocialMention[]> {
    try {
      if (!this.apiKeys.reddit) return [];

      const query = keywords.join(' ');
      const response = await firstValueFrom(
        this.httpService.get('https://oauth.reddit.com/search', {
          headers: {
            'Authorization': `Bearer ${this.apiKeys.reddit}`,
            'User-Agent': 'Veritix Analytics Bot 1.0',
          },
          params: {
            q: query,
            sort: 'new',
            limit: 100,
          },
          timeout: 10000,
        })
      );

      return this.parseRedditResponse(response.data);

    } catch (error) {
      this.logger.error('Failed to collect Reddit mentions:', error);
      return [];
    }
  }

  private async analyzeMentionsSentiment(mentions: SocialMention[]): Promise<SocialMention[]> {
    const analyzedMentions: SocialMention[] = [];

    for (const mention of mentions) {
      try {
        const sentiment = await this.analyzeSentiment(mention.content);
        analyzedMentions.push({
          ...mention,
          sentiment: sentiment.score,
          confidence: sentiment.confidence,
        });
      } catch (error) {
        const fallbackSentiment = this.fallbackSentimentAnalysis(mention.content);
        analyzedMentions.push({
          ...mention,
          sentiment: fallbackSentiment.score,
          confidence: fallbackSentiment.confidence,
        });
      }
    }

    return analyzedMentions;
  }

  private async analyzeSentiment(text: string): Promise<{ score: number; confidence: number }> {
    try {
      if (!this.apiKeys.sentiment) {
        return this.fallbackSentimentAnalysis(text);
      }

      const response = await firstValueFrom(
        this.httpService.post('https://language.googleapis.com/v1/documents:analyzeSentiment', {
          document: { type: 'PLAIN_TEXT', content: text },
          encodingType: 'UTF8',
        }, {
          headers: {
            'Authorization': `Bearer ${this.apiKeys.sentiment}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        })
      );

      return {
        score: response.data.documentSentiment.score,
        confidence: response.data.documentSentiment.magnitude,
      };

    } catch (error) {
      return this.fallbackSentimentAnalysis(text);
    }
  }

  private fallbackSentimentAnalysis(text: string): { score: number; confidence: number } {
    const positiveWords = ['great', 'awesome', 'amazing', 'love', 'excellent', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'disappointing'];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });

    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) {
      return { score: 0, confidence: 0.3 };
    }

    const score = (positiveCount - negativeCount) / totalSentimentWords;
    const confidence = Math.min(totalSentimentWords / words.length * 2, 0.8);

    return { score, confidence };
  }

  private parseTwitterResponse(data: any): SocialMention[] {
    if (!data.data) return [];

    return data.data.map(tweet => ({
      id: tweet.id,
      platform: SocialPlatform.TWITTER,
      content: tweet.text,
      author: tweet.author_id,
      followers: data.includes?.users?.find(u => u.id === tweet.author_id)?.public_metrics?.followers_count || 0,
      engagement: (tweet.public_metrics?.like_count || 0) + (tweet.public_metrics?.retweet_count || 0),
      sentiment: 0,
      confidence: 0,
      timestamp: new Date(tweet.created_at),
      url: `https://twitter.com/user/status/${tweet.id}`,
      reach: tweet.public_metrics?.impression_count || 0,
      hashtags: this.extractHashtags(tweet.text),
      mentions: this.extractMentions(tweet.text),
    }));
  }

  private parseFacebookResponse(data: any): SocialMention[] {
    if (!data.data) return [];

    return data.data.map(post => ({
      id: post.id,
      platform: SocialPlatform.FACEBOOK,
      content: post.message || '',
      author: post.from?.name || 'Unknown',
      followers: 0,
      engagement: (post.likes?.summary?.total_count || 0) + (post.comments?.summary?.total_count || 0),
      sentiment: 0,
      confidence: 0,
      timestamp: new Date(post.created_time),
      url: `https://facebook.com/${post.id}`,
      reach: 0,
      hashtags: this.extractHashtags(post.message || ''),
      mentions: this.extractMentions(post.message || ''),
    }));
  }

  private parseInstagramResponse(data: any): SocialMention[] {
    if (!data.data) return [];

    return data.data.map(post => ({
      id: post.id,
      platform: SocialPlatform.INSTAGRAM,
      content: post.caption || '',
      author: post.username || 'Unknown',
      followers: 0,
      engagement: (post.like_count || 0) + (post.comments_count || 0),
      sentiment: 0,
      confidence: 0,
      timestamp: new Date(post.timestamp),
      url: post.permalink || '',
      reach: 0,
      hashtags: this.extractHashtags(post.caption || ''),
      mentions: this.extractMentions(post.caption || ''),
    }));
  }

  private parseYouTubeResponse(data: any): SocialMention[] {
    if (!data.items) return [];

    return data.items.map(video => ({
      id: video.id.videoId,
      platform: SocialPlatform.YOUTUBE,
      content: video.snippet.title + ' ' + video.snippet.description,
      author: video.snippet.channelTitle,
      followers: 0,
      engagement: 0,
      sentiment: 0,
      confidence: 0,
      timestamp: new Date(video.snippet.publishedAt),
      url: `https://youtube.com/watch?v=${video.id.videoId}`,
      reach: 0,
      hashtags: this.extractHashtags(video.snippet.description),
      mentions: this.extractMentions(video.snippet.description),
    }));
  }

  private parseRedditResponse(data: any): SocialMention[] {
    if (!data.data?.children) return [];

    return data.data.children.map(item => ({
      id: item.data.id,
      platform: SocialPlatform.REDDIT,
      content: item.data.title + ' ' + (item.data.selftext || ''),
      author: item.data.author,
      followers: 0,
      engagement: item.data.score + item.data.num_comments,
      sentiment: 0,
      confidence: 0,
      timestamp: new Date(item.data.created_utc * 1000),
      url: `https://reddit.com${item.data.permalink}`,
      reach: item.data.score,
      hashtags: [],
      mentions: this.extractMentions(item.data.title + ' ' + (item.data.selftext || '')),
    }));
  }

  private extractHashtags(text: string): string[] {
    return text.match(/#\w+/g) || [];
  }

  private extractMentions(text: string): string[] {
    return text.match(/@\w+/g) || [];
  }

  private async createNewSentimentRecord(eventId: string, timestamp: Date): Promise<SentimentAnalysis> {
    return this.sentimentRepository.create({
      eventId,
      platform: SocialPlatform.TWITTER,
      timestamp,
      sentimentType: SentimentType.NEUTRAL,
      sentimentScore: 0,
      confidenceScore: 0,
      overallMetrics: {
        totalMentions: 0,
        totalReach: 0,
        totalEngagement: 0,
        averageSentiment: 0,
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0, mixed: 0 },
        viralityScore: 0,
        trendingScore: 0,
        influenceScore: 0,
      },
      platformBreakdown: [],
      keywordAnalysis: {
        positiveKeywords: [],
        negativeKeywords: [],
        emergingKeywords: [],
        brandMentions: [],
      },
      influencerAnalysis: {
        topInfluencers: [],
        influencerSentiment: { positive: 0, negative: 0, neutral: 0 },
        potentialPartners: [],
      },
      emotionAnalysis: {
        emotions: [],
        dominantEmotion: '',
        emotionalJourney: [],
      },
      topicAnalysis: {
        topics: [],
        trendingTopics: [],
        controversialTopics: [],
      },
      geographicSentiment: {
        regions: [],
        sentimentHeatmap: [],
        regionalTrends: [],
      },
      temporalAnalysis: {
        hourlyTrends: [],
        dailyTrends: [],
        sentimentVelocity: 0,
        peakSentimentTime: new Date(),
        lowestSentimentTime: new Date(),
        volatility: 0,
      },
      competitorComparison: {
        competitors: [],
        marketPosition: {
          rank: 0,
          sentimentRank: 0,
          shareOfVoice: 0,
          competitiveAdvantage: [],
        },
      },
      alertsAndInsights: {
        criticalAlerts: [],
        insights: [],
        recommendations: [],
      },
      contentAnalysis: {
        contentTypes: [],
        topPerformingContent: [],
        contentGaps: [],
      },
      totalDataPoints: 0,
      lastAnalyzedAt: new Date(),
    });
  }

  private updateSentimentAnalysis(analysis: SentimentAnalysis, mentions: SocialMention[]): void {
    analysis.overallMetrics.totalMentions += mentions.length;
    analysis.overallMetrics.totalReach += mentions.reduce((sum, m) => sum + m.reach, 0);
    analysis.overallMetrics.totalEngagement += mentions.reduce((sum, m) => sum + m.engagement, 0);

    const sentiments = mentions.map(m => m.sentiment);
    const positive = sentiments.filter(s => s > 0.1).length;
    const negative = sentiments.filter(s => s < -0.1).length;
    const neutral = sentiments.length - positive - negative;

    analysis.overallMetrics.sentimentDistribution = {
      positive: (positive / sentiments.length) * 100,
      negative: (negative / sentiments.length) * 100,
      neutral: (neutral / sentiments.length) * 100,
      mixed: 0,
    };

    analysis.overallMetrics.averageSentiment = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;
    analysis.sentimentScore = analysis.overallMetrics.averageSentiment;

    if (analysis.sentimentScore > 0.1) {
      analysis.sentimentType = SentimentType.POSITIVE;
    } else if (analysis.sentimentScore < -0.1) {
      analysis.sentimentType = SentimentType.NEGATIVE;
    } else {
      analysis.sentimentType = SentimentType.NEUTRAL;
    }

    this.updatePlatformBreakdown(analysis, mentions);
    this.updateKeywordAnalysis(analysis, mentions);
    this.updateInfluencerAnalysis(analysis, mentions);

    analysis.totalDataPoints += mentions.length;
    analysis.lastAnalyzedAt = new Date();
  }

  private updatePlatformBreakdown(analysis: SentimentAnalysis, mentions: SocialMention[]): void {
    const platformGroups = mentions.reduce((groups, mention) => {
      if (!groups[mention.platform]) groups[mention.platform] = [];
      groups[mention.platform].push(mention);
      return groups;
    }, {} as Record<SocialPlatform, SocialMention[]>);

    Object.entries(platformGroups).forEach(([platform, platformMentions]) => {
      let platformData = analysis.platformBreakdown.find(p => p.platform === platform);

      if (!platformData) {
        platformData = {
          platform: platform as SocialPlatform,
          mentions: 0,
          reach: 0,
          engagement: 0,
          sentiment: 0,
          confidence: 0,
          growth: 0,
          topPosts: [],
        };
        analysis.platformBreakdown.push(platformData);
      }

      platformData.mentions += platformMentions.length;
      platformData.reach += platformMentions.reduce((sum, m) => sum + m.reach, 0);
      platformData.engagement += platformMentions.reduce((sum, m) => sum + m.engagement, 0);
      platformData.sentiment = platformMentions.reduce((sum, m) => sum + m.sentiment, 0) / platformMentions.length;

      platformData.topPosts = platformMentions
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 5)
        .map(mention => ({
          id: mention.id,
          content: mention.content.substring(0, 200),
          author: mention.author,
          followers: mention.followers,
          engagement: mention.engagement,
          sentiment: mention.sentiment,
          url: mention.url,
        }));
    });
  }

  private updateKeywordAnalysis(analysis: SentimentAnalysis, mentions: SocialMention[]): void {
    const keywords = new Map<string, { count: number; sentiment: number }>();

    mentions.forEach(mention => {
      const words = mention.content.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {
          const existing = keywords.get(word) || { count: 0, sentiment: 0 };
          keywords.set(word, {
            count: existing.count + 1,
            sentiment: existing.sentiment + mention.sentiment,
          });
        }
      });
    });

    analysis.keywordAnalysis.positiveKeywords = Array.from(keywords.entries())
      .filter(([, data]) => data.sentiment > 0)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([keyword, data]) => ({
        keyword,
        frequency: data.count,
        sentiment: data.sentiment / data.count,
        context: [],
      }));

    analysis.keywordAnalysis.negativeKeywords = Array.from(keywords.entries())
      .filter(([, data]) => data.sentiment < 0)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([keyword, data]) => ({
        keyword,
        frequency: data.count,
        sentiment: data.sentiment / data.count,
        context: [],
      }));
  }

  private updateInfluencerAnalysis(analysis: SentimentAnalysis, mentions: SocialMention[]): void {
    const influencers = new Map<string, {
      platform: SocialPlatform;
      followers: number;
      engagement: number;
      sentiment: number;
      posts: number;
    }>();

    mentions.forEach(mention => {
      if (mention.followers > 1000) {
        const existing = influencers.get(mention.author) || {
          platform: mention.platform,
          followers: mention.followers,
          engagement: 0,
          sentiment: 0,
          posts: 0,
        };

        influencers.set(mention.author, {
          ...existing,
          engagement: existing.engagement + mention.engagement,
          sentiment: existing.sentiment + mention.sentiment,
          posts: existing.posts + 1,
        });
      }
    });

    analysis.influencerAnalysis.topInfluencers = Array.from(influencers.entries())
      .map(([username, data]) => ({
        username,
        platform: data.platform,
        followers: data.followers,
        engagement: data.engagement,
        sentiment: data.sentiment / data.posts,
        reach: data.followers * 0.1,
        posts: data.posts,
        influence: (data.followers * 0.1 + data.engagement) * Math.abs(data.sentiment / data.posts),
        category: data.followers > 100000 ? 'macro' : data.followers > 10000 ? 'micro' : 'nano',
      }))
      .sort((a, b) => b.influence - a.influence)
      .slice(0, 20);
  }

  private async generateSentimentAlerts(eventId: string, analysis: SentimentAnalysis): Promise<SentimentAlert[]> {
    const alerts: SentimentAlert[] = [];

    if (analysis.sentimentScore < this.alertThresholds.sentimentDropThreshold) {
      alerts.push({
        id: `sentiment_drop_${Date.now()}`,
        type: 'sentiment_drop',
        severity: 'high',
        message: `Sentiment dropped to ${(analysis.sentimentScore * 100).toFixed(1)}%`,
        platform: analysis.platform,
        data: { sentimentScore: analysis.sentimentScore },
        timestamp: new Date(),
        actionRequired: true,
        suggestedActions: ['Review recent negative mentions', 'Prepare crisis communication plan'],
      });
    }

    if (analysis.overallMetrics.sentimentDistribution.negative > 60) {
      alerts.push({
        id: `crisis_emerging_${Date.now()}`,
        type: 'crisis_emerging',
        severity: 'critical',
        message: `${analysis.overallMetrics.sentimentDistribution.negative.toFixed(1)}% of mentions are negative`,
        platform: analysis.platform,
        data: { negativePercentage: analysis.overallMetrics.sentimentDistribution.negative },
        timestamp: new Date(),
        actionRequired: true,
        suggestedActions: ['Activate crisis management team', 'Monitor for escalation'],
      });
    }

    return alerts;
  }

  private generateSentimentInsights(analysis: SentimentAnalysis): any[] {
    const insights = [];

    if (analysis.overallMetrics.sentimentDistribution.positive > 70) {
      insights.push({
        type: 'positive_momentum',
        message: 'Strong positive sentiment momentum detected',
        confidence: 0.9,
        actionable: true,
        recommendations: ['Amplify positive content', 'Engage with positive mentions'],
      });
    }

    if (analysis.influencerAnalysis.topInfluencers.length > 0) {
      const topInfluencer = analysis.influencerAnalysis.topInfluencers[0];
      insights.push({
        type: 'influencer_opportunity',
        message: `Top influencer ${topInfluencer.username} has ${topInfluencer.followers} followers`,
        confidence: 0.8,
        actionable: true,
        recommendations: ['Consider influencer partnership', 'Engage with influencer content'],
      });
    }

    return insights;
  }

  private identifyTrendingTopics(analysis: SentimentAnalysis): any[] {
    return analysis.topicAnalysis.trendingTopics.slice(0, 10);
  }

  private identifyTopInfluencers(analysis: SentimentAnalysis): any[] {
    return analysis.influencerAnalysis.topInfluencers.slice(0, 10);
  }

  private getEmptySentiment() {
    return {
      sentiment: null,
      insights: [],
      trendingTopics: [],
      topInfluencers: [],
      riskLevel: 'low',
      lastUpdated: new Date(),
    };
  }
}
