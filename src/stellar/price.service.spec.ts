import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { of, throwError } from "rxjs";
import { PriceService } from "./price.service";
import { ServiceUnavailableException } from "@nestjs/common";

describe("PriceService", () => {
  let service: PriceService;
  let httpService: HttpService;
  let cacheManager: Cache;
  let configService: ConfigService;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<PriceService>(PriceService);
    httpService = module.get<HttpService>(HttpService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe("getXLMUSDRate", () => {
    it("should return cached rate when available (cache hit)", async () => {
      const cachedRate = 0.1234;
      mockCacheManager.get.mockResolvedValue(cachedRate);

      const result = await service.getXLMUSDRate();

      expect(result).toBe(cachedRate);
      expect(mockCacheManager.get).toHaveBeenCalledWith("xlm_usd_rate");
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it("should fetch from CoinGecko API on cache miss and cache the result", async () => {
      const apiRate = 0.15;
      mockCacheManager.get.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue("coingecko");
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            stellar: {
              usd: apiRate,
            },
          },
        }),
      );

      const result = await service.getXLMUSDRate();

      expect(result).toBe(apiRate);
      expect(mockCacheManager.get).toHaveBeenCalledWith("xlm_usd_rate");
      expect(mockHttpService.get).toHaveBeenCalledWith(
        "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd",
      );
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        "xlm_usd_rate",
        apiRate,
        60000,
      );
    });

    it("should throw ServiceUnavailableException when API fails", async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue("coingecko");
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error("Network error")),
      );

      await expect(service.getXLMUSDRate()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it("should throw ServiceUnavailableException when API returns invalid rate", async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue("coingecko");
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            stellar: {
              usd: -1,
            },
          },
        }),
      );

      await expect(service.getXLMUSDRate()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it("should use custom API when configured", async () => {
      const customUrl = "https://custom.api.com/xlm-price";
      const apiRate = 0.2;
      mockCacheManager.get.mockResolvedValue(null);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "XLM_PRICE_API_SOURCE") return "custom";
        if (key === "XLM_PRICE_API_URL") return customUrl;
        return undefined;
      });
      mockHttpService.get.mockReturnValue(
        of({
          data: { price: apiRate },
        }),
      );

      const result = await service.getXLMUSDRate();

      expect(result).toBe(apiRate);
      expect(mockHttpService.get).toHaveBeenCalledWith(customUrl);
    });

    it("should throw error when custom API URL is not configured", async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "XLM_PRICE_API_SOURCE") return "custom";
        if (key === "XLM_PRICE_API_URL") return undefined;
        return undefined;
      });

      await expect(service.getXLMUSDRate()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe("convertUSDToXLM", () => {
    it("should convert USD to XLM and round up to 7 decimal places", async () => {
      const usdAmount = 100;
      const rate = 0.1; // 1 XLM = $0.10, so $100 = 1000 XLM
      mockCacheManager.get.mockResolvedValue(rate);

      const result = await service.convertUSDToXLM(usdAmount);

      expect(result).toBe(1000);
    });

    it("should round up to avoid underpayment (ceiling)", async () => {
      const usdAmount = 1;
      const rate = 0.3; // 1 XLM = $0.30, so $1 = 3.3333333... XLM
      mockCacheManager.get.mockResolvedValue(rate);

      const result = await service.convertUSDToXLM(usdAmount);

      // Should round UP to 3.3333334
      expect(result).toBe(3.3333334);
    });

    it("should return 0 when USD amount is 0", async () => {
      const result = await service.convertUSDToXLM(0);

      expect(result).toBe(0);
      expect(mockCacheManager.get).not.toHaveBeenCalled();
    });

    it("should throw error when USD amount is negative", async () => {
      await expect(service.convertUSDToXLM(-100)).rejects.toThrow(
        "USD amount cannot be negative",
      );
    });

    it("should handle small amounts with precision", async () => {
      const usdAmount = 0.01;
      const rate = 0.1; // 1 XLM = $0.10, so $0.01 = 0.1 XLM
      mockCacheManager.get.mockResolvedValue(rate);

      const result = await service.convertUSDToXLM(usdAmount);

      expect(result).toBe(0.1);
    });

    it("should propagate ServiceUnavailableException when price feed fails", async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue("coingecko");
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error("Network error")),
      );

      await expect(service.convertUSDToXLM(100)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe("Custom API response formats", () => {
    beforeEach(() => {
      mockCacheManager.get.mockResolvedValue(null);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === "XLM_PRICE_API_SOURCE") return "custom";
        if (key === "XLM_PRICE_API_URL") return "https://custom.api.com/price";
        return undefined;
      });
    });

    it("should handle 'rate' field in custom API response", async () => {
      mockHttpService.get.mockReturnValue(
        of({ data: { rate: 0.25 } }),
      );

      const result = await service.getXLMUSDRate();

      expect(result).toBe(0.25);
    });

    it("should handle 'usd' field in custom API response", async () => {
      mockHttpService.get.mockReturnValue(
        of({ data: { usd: 0.35 } }),
      );

      const result = await service.getXLMUSDRate();

      expect(result).toBe(0.35);
    });

    it("should handle 'value' field in custom API response", async () => {
      mockHttpService.get.mockReturnValue(
        of({ data: { value: 0.45 } }),
      );

      const result = await service.getXLMUSDRate();

      expect(result).toBe(0.45);
    });

    it("should handle plain number response", async () => {
      mockHttpService.get.mockReturnValue(of({ data: 0.55 }));

      const result = await service.getXLMUSDRate();

      expect(result).toBe(0.55);
    });

    it("should handle plain string response", async () => {
      mockHttpService.get.mockReturnValue(of({ data: "0.65" }));

      const result = await service.getXLMUSDRate();

      expect(result).toBe(0.65);
    });

    it("should throw error for invalid response format", async () => {
      mockHttpService.get.mockReturnValue(of({ data: null }));

      await expect(service.getXLMUSDRate()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it("should throw error for NaN in response", async () => {
      mockHttpService.get.mockReturnValue(of({ data: { price: "invalid" } }));

      await expect(service.getXLMUSDRate()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
