export enum PricingStrategy {
  FIXED = 'fixed',
  LINEAR = 'linear',
  THRESHOLD = 'threshold',
  EXPONENTIAL = 'exponential',
}

export interface PricingStrategyConfig {
  strategy: PricingStrategy;
  basePrice: number;
  maxPrice?: number;
  minPrice?: number;
  demandMultiplier?: number;
  thresholds?: PriceThreshold[];
}

export interface PriceThreshold {
  soldPercentage: number;
  priceMultiplier: number;
}

export interface DynamicPriceResult {
  currentPrice: number;
  originalPrice: number;
  strategy: PricingStrategy;
  soldCount: number;
  totalQuantity: number;
  soldPercentage: number;
}
