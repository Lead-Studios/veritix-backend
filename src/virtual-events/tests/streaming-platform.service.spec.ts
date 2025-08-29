import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { StreamingPlatformService } from '../services/streaming-platform.service';
import { StreamingPlatform } from '../enums/virtual-event.enum';
import { BadRequestException } from '@nestjs/common';
import { of } from 'rxjs';

describe('StreamingPlatformService', () => {
  let service: StreamingPlatformService;
  let httpService: HttpService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamingPlatformService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
            put: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StreamingPlatformService>(StreamingPlatformService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('createStreamingSession', () => {
    it('should create Zoom meeting successfully', async () => {
      const config = {
        platform: StreamingPlatform.ZOOM,
        credentials: {
          apiKey: 'test-key',
          apiSecret: 'test-secret',
          accountId: 'test-account',
        },
        settings: {
          title: 'Test Meeting',
          startTime: new Date(),
          duration: 60,
        },
      };

      const mockZoomResponse = {
        data: {
          id: 123456789,
          join_url: 'https://zoom.us/j/123456789',
          start_url: 'https://zoom.us/s/123456789',
          password: 'testpass',
        },
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockZoomResponse));

      const result = await service.createStreamingSession(config);

      expect(result.sessionId).toBe('123456789');
      expect(result.streamUrl).toBe('https://zoom.us/j/123456789');
      expect(result.joinUrl).toBe('https://zoom.us/j/123456789');
      expect(result.hostUrl).toBe('https://zoom.us/s/123456789');
      expect(result.password).toBe('testpass');
    });

    it('should create YouTube Live stream successfully', async () => {
      const config = {
        platform: StreamingPlatform.YOUTUBE_LIVE,
        credentials: {
          accessToken: 'test-token',
        },
        settings: {
          title: 'Test Stream',
          description: 'Test Description',
        },
      };

      const mockBroadcastResponse = {
        data: {
          id: 'broadcast-id',
        },
      };

      const mockStreamResponse = {
        data: {
          id: 'stream-id',
          cdn: {
            ingestionInfo: {
              streamName: 'stream-key',
            },
          },
        },
      };

      jest.spyOn(httpService, 'post')
        .mockReturnValueOnce(of(mockBroadcastResponse))
        .mockReturnValueOnce(of(mockStreamResponse));
      jest.spyOn(httpService, 'put').mockReturnValue(of({ data: {} }));

      const result = await service.createStreamingSession(config);

      expect(result.sessionId).toBe('broadcast-id');
      expect(result.streamUrl).toBe('https://www.youtube.com/watch?v=broadcast-id');
      expect(result.streamKey).toBe('stream-key');
    });

    it('should create Twitch stream successfully', async () => {
      const config = {
        platform: StreamingPlatform.TWITCH,
        credentials: {
          clientId: 'test-client-id',
          accessToken: 'test-token',
          streamKey: 'test-stream-key',
        },
        settings: {},
      };

      const mockUserResponse = {
        data: {
          data: [
            {
              id: 'user-id',
              login: 'testuser',
            },
          ],
        },
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockUserResponse));

      const result = await service.createStreamingSession(config);

      expect(result.sessionId).toBe('user-id');
      expect(result.streamUrl).toBe('https://www.twitch.tv/testuser');
      expect(result.streamKey).toBe('test-stream-key');
    });

    it('should create custom RTMP stream successfully', async () => {
      const config = {
        platform: StreamingPlatform.CUSTOM_RTMP,
        credentials: {
          rtmpUrl: 'rtmp://example.com/live',
          streamKey: 'custom-key',
        },
        settings: {},
      };

      const result = await service.createStreamingSession(config);

      expect(result.streamUrl).toBe('rtmp://example.com/live');
      expect(result.streamKey).toBe('custom-key');
      expect(result.sessionId).toMatch(/^rtmp_\d+$/);
    });

    it('should create WebRTC session successfully', async () => {
      const config = {
        platform: StreamingPlatform.WEBRTC,
        credentials: {},
        settings: {
          baseUrl: 'https://meet.example.com',
        },
      };

      const result = await service.createStreamingSession(config);

      expect(result.streamUrl).toMatch(/^https:\/\/meet\.example\.com\/webrtc_\d+$/);
      expect(result.joinUrl).toMatch(/^https:\/\/meet\.example\.com\/webrtc_\d+$/);
      expect(result.sessionId).toMatch(/^webrtc_\d+$/);
    });

    it('should throw error for unsupported platform', async () => {
      const config = {
        platform: 'unsupported' as StreamingPlatform,
        credentials: {},
        settings: {},
      };

      await expect(service.createStreamingSession(config)).rejects.toThrow(BadRequestException);
    });

    it('should handle Zoom API errors', async () => {
      const config = {
        platform: StreamingPlatform.ZOOM,
        credentials: {
          apiKey: 'invalid-key',
          apiSecret: 'invalid-secret',
          accountId: 'invalid-account',
        },
        settings: {},
      };

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({
          data: null,
        })
      );

      // Mock the actual HTTP error
      jest.spyOn(httpService, 'post').mockImplementation(() => {
        throw new Error('Zoom API Error');
      });

      await expect(service.createStreamingSession(config)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStreamingSession', () => {
    it('should throw error for unsupported update', async () => {
      await expect(
        service.updateStreamingSession('session-id', StreamingPlatform.CUSTOM_RTMP, {})
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteStreamingSession', () => {
    it('should handle deletion gracefully', async () => {
      await expect(
        service.deleteStreamingSession('session-id', StreamingPlatform.CUSTOM_RTMP)
      ).resolves.toBeUndefined();
    });
  });

  describe('startStreaming', () => {
    it('should handle start gracefully', async () => {
      await expect(
        service.startStreaming('session-id', StreamingPlatform.CUSTOM_RTMP)
      ).resolves.toBeUndefined();
    });
  });

  describe('stopStreaming', () => {
    it('should handle stop gracefully', async () => {
      await expect(
        service.stopStreaming('session-id', StreamingPlatform.CUSTOM_RTMP)
      ).resolves.toBeUndefined();
    });
  });
});
