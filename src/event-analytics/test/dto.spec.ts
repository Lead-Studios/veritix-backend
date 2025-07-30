import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { TrackViewDto } from '../dto/track-view.dto';
import { TrackPurchaseDto } from '../dto/track-purchase.dto';
import { TrackEngagementDto } from '../dto/track-engagement.dto';
import { EngagementType } from '../entities/event-engagement.entity';

describe('Event Analytics DTOs', () => {
  describe('TrackViewDto', () => {
    it('should validate valid view tracking data', async () => {
      const viewData = {
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440002',
        trafficSource: 'google',
        referrerUrl: 'https://google.com/search',
        utmSource: 'google',
        utmMedium: 'organic',
        utmCampaign: 'tech-conference-2024',
        utmTerm: 'tech conference',
        utmContent: 'ad-variant-a',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        deviceType: 'desktop',
        browser: 'chrome',
        operatingSystem: 'windows',
        country: 'United States',
        city: 'San Francisco',
        timeOnPage: 180,
        convertedToPurchase: true,
        purchaseId: '550e8400-e29b-41d4-a716-446655440003',
      };

      const dto = plainToClass(TrackViewDto, viewData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.eventId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(dto.timeOnPage).toBe(180);
      expect(dto.convertedToPurchase).toBe(true);
    });

    it('should validate minimal view tracking data', async () => {
      const viewData = {
        eventId: '550e8400-e29b-41d4-a716-446655440001',
      };

      const dto = plainToClass(TrackViewDto, viewData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.eventId).toBe('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should reject invalid UUID for eventId', async () => {
      const viewData = {
        eventId: 'invalid-uuid',
      };

      const dto = plainToClass(TrackViewDto, viewData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('eventId');
    });

    it('should reject time on page exceeding 24 hours', async () => {
      const viewData = {
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        timeOnPage: 90000, // More than 24 hours (86400 seconds)
      };

      const dto = plainToClass(TrackViewDto, viewData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('timeOnPage');
    });

    it('should reject negative time on page', async () => {
      const viewData = {
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        timeOnPage: -10,
      };

      const dto = plainToClass(TrackViewDto, viewData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('timeOnPage');
    });
  });

  describe('TrackPurchaseDto', () => {
    it('should validate valid purchase tracking data', async () => {
      const purchaseData = {
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        purchaserId: '550e8400-e29b-41d4-a716-446655440002',
        purchaserName: 'John Doe',
        purchaserEmail: 'john@example.com',
        quantity: 2,
        unitPrice: 99.99,
        totalAmount: 199.98,
        discountAmount: 20.0,
        discountCode: 'EARLY20',
        status: 'completed',
        paymentMethod: 'credit_card',
        transactionId: 'txn_1234567890',
        trafficSource: 'email',
        referrerUrl: 'https://mailchimp.com',
        utmSource: 'newsletter',
        utmMedium: 'email',
        utmCampaign: 'weekly-digest',
        deviceType: 'desktop',
        country: 'United States',
        city: 'New York',
      };

      const dto = plainToClass(TrackPurchaseDto, purchaseData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.quantity).toBe(2);
      expect(dto.unitPrice).toBe(99.99);
      expect(dto.totalAmount).toBe(199.98);
      expect(dto.discountAmount).toBe(20.0);
    });

    it('should reject quantity less than 1', async () => {
      const purchaseData = {
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        purchaserId: '550e8400-e29b-41d4-a716-446655440002',
        purchaserName: 'John Doe',
        purchaserEmail: 'john@example.com',
        quantity: 0,
        unitPrice: 99.99,
        totalAmount: 0,
        status: 'completed',
      };

      const dto = plainToClass(TrackPurchaseDto, purchaseData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('quantity');
    });

    it('should reject negative unit price', async () => {
      const purchaseData = {
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        purchaserId: '550e8400-e29b-41d4-a716-446655440002',
        purchaserName: 'John Doe',
        purchaserEmail: 'john@example.com',
        quantity: 1,
        unitPrice: -10,
        totalAmount: -10,
        status: 'completed',
      };

      const dto = plainToClass(TrackPurchaseDto, purchaseData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(2); // unitPrice and totalAmount
      expect(errors.some((e) => e.property === 'unitPrice')).toBe(true);
      expect(errors.some((e) => e.property === 'totalAmount')).toBe(true);
    });

    it('should reject negative discount amount', async () => {
      const purchaseData = {
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        purchaserId: '550e8400-e29b-41d4-a716-446655440002',
        purchaserName: 'John Doe',
        purchaserEmail: 'john@example.com',
        quantity: 1,
        unitPrice: 100,
        totalAmount: 100,
        discountAmount: -5,
        status: 'completed',
      };

      const dto = plainToClass(TrackPurchaseDto, purchaseData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('discountAmount');
    });
  });

  describe('TrackEngagementDto', () => {
    it('should validate valid engagement tracking data', async () => {
      const engagementData = {
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440002',
        engagementType: EngagementType.SHARE,
        metadata: {
          platform: 'twitter',
          url: 'https://twitter.com/share',
          text: 'Check out this amazing event!',
        },
        trafficSource: 'social',
        deviceType: 'mobile',
      };

      const dto = plainToClass(TrackEngagementDto, engagementData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.engagementType).toBe(EngagementType.SHARE);
      expect(dto.metadata).toEqual({
        platform: 'twitter',
        url: 'https://twitter.com/share',
        text: 'Check out this amazing event!',
      });
    });

    it('should validate all engagement types', async () => {
      const engagementTypes = Object.values(EngagementType);

      for (const type of engagementTypes) {
        const engagementData = {
          eventId: '550e8400-e29b-41d4-a716-446655440001',
          engagementType: type,
        };

        const dto = plainToClass(TrackEngagementDto, engagementData);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.engagementType).toBe(type);
      }
    });

    it('should reject invalid engagement type', async () => {
      const engagementData = {
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        engagementType: 'invalid_type',
      };

      const dto = plainToClass(TrackEngagementDto, engagementData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('engagementType');
    });

    it('should allow anonymous engagement tracking', async () => {
      const engagementData = {
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        engagementType: EngagementType.PAGE_VIEW,
        // No userId provided
      };

      const dto = plainToClass(TrackEngagementDto, engagementData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.userId).toBeUndefined();
    });
  });
});
