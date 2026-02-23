import { Injectable, ServiceUnavailableException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject } from "@nestjs/common";
import { Cache } from "cache-manager";
import { firstValueFrom } from "rxjs";

interface CoinGeckoResponse {
  stellar?: {
    usd?: number;
  };
}

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);
  private readonly CACHE_KEY = "xlm_usd_rate";
  private readonly CACHE_TTL = 60000; // 60 seconds in milliseconds

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Fetches the current XLM/USD exchange rate.
   * Uses cache if available (60 second TTL).
   * Supports CoinGecko API or custom price feed via environment configuration.
   */
  async getXLMUSDRate(): Promise<number> {
    // Check cache first
    const cachedRate = await this.cacheManager.get<number>(this.CACHE_KEY);
    if (cachedRate !== null && cachedRate !== undefined) {
      this.logger.debug(`Cache hit: XLM/USD rate = ${cachedRate}`);
      return cachedRate;
    }

    this.logger.debug("Cache miss: Fetching XLM/USD rate from API");

    try {
      const rate = await this.fetchRateFromAPI();
      
      // Store in cache for 60 seconds
      await this.cacheManager.set(this.CACHE_KEY, rate, this.CACHE_TTL);
      
      this.logger.debug(`Fetched and cached XLM/USD rate = ${rate}`);
      return rate;
    } catch (error) {
      this.logger.error(`Failed to fetch XLM/USD rate: ${error.message}`);
      throw new ServiceUnavailableException(
        "Price feed unavailable. Unable to retrieve XLM/USD exchange rate. Please try again later.",
      );
    }
  }

  /**
   * Converts USD amount to XLM at the current market rate.
   * Rounds up to 7 decimal places (Stellar's precision) to avoid underpayment.
   */
  async convertUSDToXLM(usd: number): Promise<number> {
    if (usd < 0) {
      throw new Error("USD amount cannot be negative");
    }

    if (usd === 0) {
      return 0;
    }

    const rate = await this.getXLMUSDRate();
    const xlmAmount = usd / rate;
    
    // Round up to 7 decimal places (Stellar's precision)
    // Using ceiling to avoid underpayment edge cases
    const factor = 10 ** 7;
    const roundedXLM = Math.ceil(xlmAmount * factor) / factor;
    
    this.logger.debug(`Converted ${usd} USD to ${roundedXLM} XLM at rate ${rate}`);
    
    return roundedXLM;
  }

  /**
   * Fetches the rate from the configured API source.
   * Supports CoinGecko (default) or custom API via XLM_PRICE_API_URL.
   */
  private async fetchRateFromAPI(): Promise<number> {
    const apiSource = this.configService.get<string>("XLM_PRICE_API_SOURCE", "coingecko");
    
    if (apiSource === "coingecko") {
      return this.fetchFromCoinGecko();
    } else {
      return this.fetchFromCustomAPI();
    }
  }

  /**
   * Fetches XLM/USD rate from CoinGecko's free API.
   */
  private async fetchFromCoinGecko(): Promise<number> {
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd";
    
    const response = await firstValueFrom(
      this.httpService.get<CoinGeckoResponse>(url),
    );

    const rate = response.data?.stellar?.usd;
    
    if (rate === undefined || rate === null || rate <= 0) {
      throw new Error("Invalid rate received from CoinGecko API");
    }

    return rate;
  }

  /**
   * Fetches XLM/USD rate from a custom API endpoint.
   * Expects JSON response with 'price' or 'rate' field, or plain text with the rate.
   */
  private async fetchFromCustomAPI(): Promise<number> {
    const customUrl = this.configService.get<string>("XLM_PRICE_API_URL");
    
    if (!customUrl) {
      throw new Error("XLM_PRICE_API_URL must be configured when using custom API source");
    }

    const response = await firstValueFrom(
      this.httpService.get(customUrl),
    );

    let rate: number;

    // Handle different response formats
    if (typeof response.data === "number") {
      rate = response.data;
    } else if (typeof response.data === "string") {
      rate = parseFloat(response.data);
    } else if (response.data && typeof response.data === "object") {
      // Try common field names
      rate = response.data.price || response.data.rate || response.data.usd || response.data.value;
    } else {
      throw new Error("Unexpected response format from custom price API");
    }

    if (rate === undefined || rate === null || isNaN(rate) || rate <= 0) {
      throw new Error("Invalid rate received from custom price API");
    }

    return rate;
  }
}
