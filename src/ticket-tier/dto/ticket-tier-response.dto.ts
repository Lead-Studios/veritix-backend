import { PricingStrategy } from '../enums/pricing-strategy.enum';

export class TicketTierResponseDto {
  id: string;
  name: string;
  originalPrice: number;
  currentPrice: number;
  quantity: number;
  benefits?: string;
  pricingStrategy: PricingStrategy;
  soldCount: number;
  availableQuantity: number;
  soldPercentage: number;
  pricingConfig?: {
    maxPrice?: number;
    minPrice?: number;
    demandMultiplier?: number;
    thresholds?: Array<{
      soldPercentage: number;
      priceMultiplier: number;
    }>;
  };
  eventId: string;
} 