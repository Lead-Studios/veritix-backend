import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SocialPlatform } from '../entities/social-account.entity';
import { PostType } from '../entities/social-post.entity';

export interface PlatformCredentials {
  accessToken: string;
  refreshToken?: string;
  appId?: string;
  appSecret?: string;
  pageId?: string;
  businessAccountId?: string;
}

export interface PostData {
  content: string;
  media?: Array<{
    type: 'image' | 'video';
    url: string;
    altText?: string;
  }>;
  link?: string;
  scheduledTime?: Date;
  targeting?: Record<string, any>;
}

export interface PostResult {
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
  scheduledFor?: Date;
}

@Injectable()
export class SocialMediaApiService {
  private readonly logger = new Logger(SocialMediaApiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async publishPost(
    platform: SocialPlatform,
    credentials: PlatformCredentials,
    postData: PostData,
  ): Promise<PostResult> {
    try {
      switch (platform) {
        case SocialPlatform.FACEBOOK:
          return await this.publishToFacebook(credentials, postData);
        case SocialPlatform.INSTAGRAM:
          return await this.publishToInstagram(credentials, postData);
        case SocialPlatform.TWITTER:
          return await this.publishToTwitter(credentials, postData);
        case SocialPlatform.LINKEDIN:
          return await this.publishToLinkedIn(credentials, postData);
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      this.logger.error(`Failed to publish to ${platform}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async publishToFacebook(
    credentials: PlatformCredentials,
    postData: PostData,
  ): Promise<PostResult> {
    const pageId = credentials.pageId;
    const accessToken = credentials.accessToken;

    if (!pageId) {
      throw new Error('Facebook page ID is required');
    }

    const url = `https://graph.facebook.com/v18.0/${pageId}/feed`;
    
    const payload: any = {
      message: postData.content,
      access_token: accessToken,
    };

    // Handle media
    if (postData.media && postData.media.length > 0) {
      if (postData.media.length === 1) {
        const media = postData.media[0];
        if (media.type === 'image') {
          payload.link = media.url;
        } else if (media.type === 'video') {
          // For video, use different endpoint
          const videoUrl = `https://graph.facebook.com/v18.0/${pageId}/videos`;
          const videoPayload = {
            description: postData.content,
            file_url: media.url,
            access_token: accessToken,
          };
          
          if (postData.scheduledTime) {
            videoPayload['scheduled_publish_time'] = Math.floor(postData.scheduledTime.getTime() / 1000);
            videoPayload['published'] = false;
          }

          const response = await firstValueFrom(
            this.httpService.post(videoUrl, videoPayload)
          );

          return {
            success: true,
            platformPostId: response.data.id,
            platformUrl: `https://facebook.com/${response.data.id}`,
            scheduledFor: postData.scheduledTime,
          };
        }
      } else {
        // Multiple media - create album
        payload.attached_media = postData.media.map((media, index) => ({
          media_fbid: `temp_${index}`, // This would need proper media upload first
        }));
      }
    }

    // Handle link
    if (postData.link) {
      payload.link = postData.link;
    }

    // Handle scheduling
    if (postData.scheduledTime) {
      payload.scheduled_publish_time = Math.floor(postData.scheduledTime.getTime() / 1000);
      payload.published = false;
    }

    const response = await firstValueFrom(
      this.httpService.post(url, payload)
    );

    return {
      success: true,
      platformPostId: response.data.id,
      platformUrl: `https://facebook.com/${response.data.id}`,
      scheduledFor: postData.scheduledTime,
    };
  }

  private async publishToInstagram(
    credentials: PlatformCredentials,
    postData: PostData,
  ): Promise<PostResult> {
    const businessAccountId = credentials.businessAccountId;
    const accessToken = credentials.accessToken;

    if (!businessAccountId) {
      throw new Error('Instagram business account ID is required');
    }

    // Instagram requires media for posts
    if (!postData.media || postData.media.length === 0) {
      throw new Error('Instagram posts require media');
    }

    const media = postData.media[0];
    const mediaType = media.type === 'video' ? 'VIDEO' : 'IMAGE';

    // Step 1: Create media container
    const containerUrl = `https://graph.facebook.com/v18.0/${businessAccountId}/media`;
    const containerPayload: any = {
      image_url: media.url,
      caption: postData.content,
      media_type: mediaType,
      access_token: accessToken,
    };

    if (media.type === 'video') {
      containerPayload.video_url = media.url;
      delete containerPayload.image_url;
    }

    const containerResponse = await firstValueFrom(
      this.httpService.post(containerUrl, containerPayload)
    );

    const containerId = containerResponse.data.id;

    // Step 2: Publish the media container
    const publishUrl = `https://graph.facebook.com/v18.0/${businessAccountId}/media_publish`;
    const publishPayload = {
      creation_id: containerId,
      access_token: accessToken,
    };

    const publishResponse = await firstValueFrom(
      this.httpService.post(publishUrl, publishPayload)
    );

    return {
      success: true,
      platformPostId: publishResponse.data.id,
      platformUrl: `https://instagram.com/p/${publishResponse.data.id}`,
    };
  }

  private async publishToTwitter(
    credentials: PlatformCredentials,
    postData: PostData,
  ): Promise<PostResult> {
    // Twitter API v2 implementation
    const url = 'https://api.twitter.com/2/tweets';
    
    const payload: any = {
      text: postData.content,
    };

    // Handle media
    if (postData.media && postData.media.length > 0) {
      // Media would need to be uploaded first using media upload endpoint
      const mediaIds = await this.uploadTwitterMedia(credentials, postData.media);
      payload.media = { media_ids: mediaIds };
    }

    const headers = {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
    };

    const response = await firstValueFrom(
      this.httpService.post(url, payload, { headers })
    );

    return {
      success: true,
      platformPostId: response.data.data.id,
      platformUrl: `https://twitter.com/i/web/status/${response.data.data.id}`,
    };
  }

  private async publishToLinkedIn(
    credentials: PlatformCredentials,
    postData: PostData,
  ): Promise<PostResult> {
    const url = 'https://api.linkedin.com/v2/ugcPosts';
    
    const payload: any = {
      author: `urn:li:person:${credentials.appId}`, // This would be the LinkedIn person/organization ID
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: postData.content,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    // Handle media
    if (postData.media && postData.media.length > 0) {
      payload.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
      payload.specificContent['com.linkedin.ugc.ShareContent'].media = postData.media.map(media => ({
        status: 'READY',
        description: {
          text: media.altText || '',
        },
        media: media.url, // This would need proper LinkedIn media upload
      }));
    }

    const headers = {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    };

    const response = await firstValueFrom(
      this.httpService.post(url, payload, { headers })
    );

    return {
      success: true,
      platformPostId: response.headers['x-restli-id'],
      platformUrl: `https://linkedin.com/feed/update/${response.headers['x-restli-id']}`,
    };
  }

  private async uploadTwitterMedia(
    credentials: PlatformCredentials,
    media: Array<{ type: 'image' | 'video'; url: string; altText?: string }>,
  ): Promise<string[]> {
    const mediaIds: string[] = [];

    for (const item of media) {
      const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
      
      // This is simplified - actual implementation would need to handle chunked upload for large files
      const payload = {
        media_data: item.url, // This would be base64 encoded media data
        media_category: item.type === 'video' ? 'tweet_video' : 'tweet_image',
      };

      if (item.altText) {
        payload['alt_text'] = { text: item.altText };
      }

      const headers = {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      const response = await firstValueFrom(
        this.httpService.post(uploadUrl, payload, { headers })
      );

      mediaIds.push(response.data.media_id_string);
    }

    return mediaIds;
  }

  async getPostEngagement(
    platform: SocialPlatform,
    credentials: PlatformCredentials,
    platformPostId: string,
  ): Promise<any> {
    try {
      switch (platform) {
        case SocialPlatform.FACEBOOK:
          return await this.getFacebookEngagement(credentials, platformPostId);
        case SocialPlatform.INSTAGRAM:
          return await this.getInstagramEngagement(credentials, platformPostId);
        case SocialPlatform.TWITTER:
          return await this.getTwitterEngagement(credentials, platformPostId);
        case SocialPlatform.LINKEDIN:
          return await this.getLinkedInEngagement(credentials, platformPostId);
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      this.logger.error(`Failed to get engagement for ${platform}:`, error);
      return null;
    }
  }

  private async getFacebookEngagement(
    credentials: PlatformCredentials,
    postId: string,
  ): Promise<any> {
    const url = `https://graph.facebook.com/v18.0/${postId}`;
    const params = {
      fields: 'likes.summary(true),comments.summary(true),shares,reactions.summary(true)',
      access_token: credentials.accessToken,
    };

    const response = await firstValueFrom(
      this.httpService.get(url, { params })
    );

    return {
      likes: response.data.likes?.summary?.total_count || 0,
      comments: response.data.comments?.summary?.total_count || 0,
      shares: response.data.shares?.count || 0,
      reactions: response.data.reactions?.summary?.total_count || 0,
    };
  }

  private async getInstagramEngagement(
    credentials: PlatformCredentials,
    postId: string,
  ): Promise<any> {
    const url = `https://graph.facebook.com/v18.0/${postId}`;
    const params = {
      fields: 'like_count,comments_count,media_type,media_url,permalink',
      access_token: credentials.accessToken,
    };

    const response = await firstValueFrom(
      this.httpService.get(url, { params })
    );

    return {
      likes: response.data.like_count || 0,
      comments: response.data.comments_count || 0,
      shares: 0, // Instagram doesn't provide share count via API
      saves: 0, // Would need Instagram Insights API for saves
    };
  }

  private async getTwitterEngagement(
    credentials: PlatformCredentials,
    tweetId: string,
  ): Promise<any> {
    const url = `https://api.twitter.com/2/tweets/${tweetId}`;
    const params = {
      'tweet.fields': 'public_metrics',
    };

    const headers = {
      'Authorization': `Bearer ${credentials.accessToken}`,
    };

    const response = await firstValueFrom(
      this.httpService.get(url, { params, headers })
    );

    const metrics = response.data.data.public_metrics;
    return {
      likes: metrics.like_count || 0,
      comments: metrics.reply_count || 0,
      shares: metrics.retweet_count || 0,
      impressions: metrics.impression_count || 0,
    };
  }

  private async getLinkedInEngagement(
    credentials: PlatformCredentials,
    postId: string,
  ): Promise<any> {
    const url = `https://api.linkedin.com/v2/socialActions/${postId}`;
    
    const headers = {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
    };

    const response = await firstValueFrom(
      this.httpService.get(url, { headers })
    );

    return {
      likes: response.data.likesSummary?.totalLikes || 0,
      comments: response.data.commentsSummary?.totalComments || 0,
      shares: response.data.sharesSummary?.totalShares || 0,
    };
  }

  async refreshAccessToken(
    platform: SocialPlatform,
    refreshToken: string,
    appId: string,
    appSecret: string,
  ): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
    try {
      switch (platform) {
        case SocialPlatform.FACEBOOK:
        case SocialPlatform.INSTAGRAM:
          return await this.refreshFacebookToken(refreshToken, appId, appSecret);
        case SocialPlatform.TWITTER:
          return await this.refreshTwitterToken(refreshToken, appId, appSecret);
        case SocialPlatform.LINKEDIN:
          return await this.refreshLinkedInToken(refreshToken, appId, appSecret);
        default:
          throw new Error(`Token refresh not supported for platform: ${platform}`);
      }
    } catch (error) {
      this.logger.error(`Failed to refresh token for ${platform}:`, error);
      throw error;
    }
  }

  private async refreshFacebookToken(
    refreshToken: string,
    appId: string,
    appSecret: string,
  ): Promise<{ accessToken: string; expiresAt?: Date }> {
    const url = 'https://graph.facebook.com/v18.0/oauth/access_token';
    const params = {
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: refreshToken,
    };

    const response = await firstValueFrom(
      this.httpService.get(url, { params })
    );

    const expiresAt = response.data.expires_in 
      ? new Date(Date.now() + response.data.expires_in * 1000)
      : undefined;

    return {
      accessToken: response.data.access_token,
      expiresAt,
    };
  }

  private async refreshTwitterToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    const url = 'https://api.twitter.com/2/oauth2/token';
    
    const payload = new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      client_id: clientId,
    });

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const response = await firstValueFrom(
      this.httpService.post(url, payload, { headers })
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
    };
  }

  private async refreshLinkedInToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    const url = 'https://www.linkedin.com/oauth/v2/accessToken';
    
    const payload = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const response = await firstValueFrom(
      this.httpService.post(url, payload, { headers })
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
    };
  }
}
