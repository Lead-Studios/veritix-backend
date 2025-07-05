import { validate } from 'class-validator';
import { CreateTicketTierDto, PricingConfigDto, PriceThresholdDto } from '../dto/create-ticket-tier.dto';
import { PricingStrategy } from '../enums/pricing-strategy.enum';

describe('CreateTicketTierDto', () => {
  describe('basic validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = new CreateTicketTierDto();
      dto.name = 'VIP Ticket';
      dto.price = 100;
      dto.quantity = 100;
      dto.benefits = 'Premium seating';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with missing required fields', async () => {
      const dto = new CreateTicketTierDto();
      dto.name = 'VIP Ticket';
      // Missing price and quantity

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'price')).toBe(true);
      expect(errors.some(e => e.property === 'quantity')).toBe(true);
    });

    it('should fail validation with negative price', async () => {
      const dto = new CreateTicketTierDto();
      dto.name = 'VIP Ticket';
      dto.price = -10;
      dto.quantity = 100;

      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'price')).toBe(true);
    });

    it('should fail validation with zero quantity', async () => {
      const dto = new CreateTicketTierDto();
      dto.name = 'VIP Ticket';
      dto.price = 100;
      dto.quantity = 0;

      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'quantity')).toBe(true);
    });
  });

  describe('pricing strategy validation', () => {
    it('should pass validation with valid pricing strategy', async () => {
      const dto = new CreateTicketTierDto();
      dto.name = 'VIP Ticket';
      dto.price = 100;
      dto.quantity = 100;
      dto.pricingStrategy = PricingStrategy.LINEAR;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid pricing strategy', async () => {
      const dto = new CreateTicketTierDto();
      dto.name = 'VIP Ticket';
      dto.price = 100;
      dto.quantity = 100;
      dto.pricingStrategy = 'INVALID_STRATEGY' as PricingStrategy;

      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'pricingStrategy')).toBe(true);
    });

    it('should pass validation with all pricing strategies', async () => {
      const strategies = [
        PricingStrategy.FIXED,
        PricingStrategy.LINEAR,
        PricingStrategy.THRESHOLD,
        PricingStrategy.EXPONENTIAL,
      ];

      for (const strategy of strategies) {
        const dto = new CreateTicketTierDto();
        dto.name = 'VIP Ticket';
        dto.price = 100;
        dto.quantity = 100;
        dto.pricingStrategy = strategy;

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('pricing config validation', () => {
    it('should pass validation with valid pricing config', async () => {
      const dto = new CreateTicketTierDto();
      dto.name = 'VIP Ticket';
      dto.price = 100;
      dto.quantity = 100;
      dto.pricingStrategy = PricingStrategy.LINEAR;
      dto.pricingConfig = {
        demandMultiplier: 1.5,
        maxPrice: 150,
        minPrice: 80,
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with negative maxPrice', async () => {
      const dto = new CreateTicketTierDto();
      dto.name = 'VIP Ticket';
      dto.price = 100;
      dto.quantity = 100;
      dto.pricingConfig = {
        maxPrice: -10,
      };

      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'pricingConfig')).toBe(true);
    });

    it('should fail validation with negative minPrice', async () => {
      const dto = new CreateTicketTierDto();
      dto.name = 'VIP Ticket';
      dto.price = 100;
      dto.quantity = 100;
      dto.pricingConfig = {
        minPrice: -10,
      };

      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'pricingConfig')).toBe(true);
    });

    it('should fail validation with demandMultiplier less than 1', async () => {
      const dto = new CreateTicketTierDto();
      dto.name = 'VIP Ticket';
      dto.price = 100;
      dto.quantity = 100;
      dto.pricingConfig = {
        demandMultiplier: 0.5,
      };

      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'pricingConfig')).toBe(true);
    });
  });

  describe('thresholds validation', () => {
    it('should pass validation with valid thresholds', async () => {
      const dto = new CreateTicketTierDto();
      dto.name = 'VIP Ticket';
      dto.price = 100;
      dto.quantity = 100;
      dto.pricingStrategy = PricingStrategy.THRESHOLD;
      dto.pricingConfig = {
        thresholds: [
          { soldPercentage: 25, priceMultiplier: 1.1 },
          { soldPercentage: 50, priceMultiplier: 1.25 },
          { soldPercentage: 75, priceMultiplier: 1.5 },
        ],
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid threshold soldPercentage', async () => {
      const dto = new CreateTicketTierDto();
      dto.name = 'VIP Ticket';
      dto.price = 100;
      dto.quantity = 100;
      dto.pricingConfig = {
        thresholds: [
          { soldPercentage: -10, priceMultiplier: 1.1 },
        ],
      };

      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'pricingConfig')).toBe(true);
    });

    it('should fail validation with invalid threshold priceMultiplier', async () => {
      const dto = new CreateTicketTierDto();
      dto.name = 'VIP Ticket';
      dto.price = 100;
      dto.quantity = 100;
      dto.pricingConfig = {
        thresholds: [
          { soldPercentage: 25, priceMultiplier: 0.5 },
        ],
      };

      const errors = await validate(dto);
      expect(errors.some(e => e.property === 'pricingConfig')).toBe(true);
    });
  });
});

describe('PricingConfigDto', () => {
  it('should pass validation with valid config', async () => {
    const dto = new PricingConfigDto();
    dto.maxPrice = 150;
    dto.minPrice = 80;
    dto.demandMultiplier = 1.5;
    dto.thresholds = [
      { soldPercentage: 25, priceMultiplier: 1.1 },
      { soldPercentage: 50, priceMultiplier: 1.25 },
    ];

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with partial config', async () => {
    const dto = new PricingConfigDto();
    dto.demandMultiplier = 1.5;

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('PriceThresholdDto', () => {
  it('should pass validation with valid threshold', async () => {
    const dto = new PriceThresholdDto();
    dto.soldPercentage = 25;
    dto.priceMultiplier = 1.1;

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation with negative soldPercentage', async () => {
    const dto = new PriceThresholdDto();
    dto.soldPercentage = -10;
    dto.priceMultiplier = 1.1;

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'soldPercentage')).toBe(true);
  });

  it('should fail validation with priceMultiplier less than 1', async () => {
    const dto = new PriceThresholdDto();
    dto.soldPercentage = 25;
    dto.priceMultiplier = 0.5;

    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'priceMultiplier')).toBe(true);
  });
}); 