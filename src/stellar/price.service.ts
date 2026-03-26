import {
    Injectable,
    Inject,
    ServiceUnavailableException,
    Logger,
  } from '@nestjs/common';
  import { CACHE_MANAGER } from '@nestjs/cache-manager';
  import { Cache } from 'cache-manager';
  
  @Injectable()
  export class PriceService {
    private readonly logger = new Logger(PriceService.name);
  
    constructor(
      @Inject(CACHE_MANAGER)
      private readonly cacheManager: Cache,
    ) {}
  
    private readonly CACHE_KEY = 'xlm_usd_rate';
    private readonly CACHE_TTL = 60; // seconds
  
    private readonly PRICE_FEED_URL =
      process.env.PRICE_FEED_URL ||
      'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd';
  
    // -------------------------------
    // GET XLM/USD RATE
    // -------------------------------
    async getXLMUSDRate(): Promise<number> {
      // ✅ Check cache first
      const cached = await this.cacheManager.get<number>(this.CACHE_KEY);
      if (cached) return cached;
  
      try {
        const res = await fetch(this.PRICE_FEED_URL);
  
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
  
        const data = await res.json();
  
        const rate = data?.stellar?.usd;
  
        if (!rate || rate <= 0) {
          throw new Error('Invalid price data');
        }
  
        // ✅ Cache result
        await this.cacheManager.set(this.CACHE_KEY, rate, this.CACHE_TTL);
  
        return rate;
      } catch (error) {
        this.logger.error(
          `Failed to fetch XLM/USD rate: ${(error as Error).message}`,
        );
  
        throw new ServiceUnavailableException(
          'Unable to fetch XLM/USD price. Please try again later.',
        );
      }
    }
  
    // -------------------------------
    // CONVERT USD → XLM
    // -------------------------------
    async convertUSDToXLM(usdAmount: number): Promise<string> {
      if (!usdAmount || usdAmount <= 0) {
        throw new ServiceUnavailableException('Invalid USD amount');
      }
  
      const rate = await this.getXLMUSDRate();
  
      // USD / (USD per XLM) = XLM
      const rawXLM = usdAmount / rate;
  
      // ✅ Round UP to 7 decimal places
      const rounded = this.roundUp(rawXLM, 7);
  
      return rounded.toFixed(7);
    }
  
    // -------------------------------
    // ROUND UP (CRITICAL)
    // -------------------------------
    private roundUp(value: number, decimals: number): number {
      const factor = Math.pow(10, decimals);
      return Math.ceil(value * factor) / factor;
    }
  }