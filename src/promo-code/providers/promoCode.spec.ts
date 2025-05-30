// test/promo-code.service.spec.ts

import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BadRequestException } from "@nestjs/common";
import { PromoCodeService } from "./promo-code.service";
import { PromoCode } from "../promoCode.entity";
import { Event } from "src/events/entities/event.entity";

const mockPromoCodeRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
});

const mockEventRepo = () => ({
  findOneOrFail: jest.fn(),
});

describe("PromoCodeService", () => {
  let service: PromoCodeService;
  let promoRepo: jest.Mocked<Repository<PromoCode>>;
  let eventRepo: jest.Mocked<Repository<Event>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromoCodeService,
        {
          provide: getRepositoryToken(PromoCode),
          useFactory: mockPromoCodeRepo,
        },
        {
          provide: getRepositoryToken(Event),
          useFactory: mockEventRepo,
        },
      ],
    }).compile();

    service = module.get(PromoCodeService);
    promoRepo = module.get(getRepositoryToken(PromoCode));
    eventRepo = module.get(getRepositoryToken(Event));
  });

  describe("createPromoCode", () => {
    it("should create and save a promo code", async () => {
      const mockEvent = { id: "1" } as Event;
      const dto = {
        id: 1,
        event: mockEvent,
        code: "SAVE50",
        discount: 50,
        maxUses: 5,
        uses: 0,
        expiresAt: new Date(),
      };

      eventRepo.findOneOrFail.mockResolvedValue(mockEvent);
      promoRepo.create.mockReturnValue({ ...dto, event: mockEvent });
      promoRepo.save.mockResolvedValue({ id: 1, ...dto, event: mockEvent });

      const result = await service.createPromoCode("1", dto);
      expect(result.code).toBe("SAVE50");
      expect(promoRepo.create).toHaveBeenCalledWith({
        ...dto,
        event: mockEvent,
      });
      expect(promoRepo.save).toHaveBeenCalled();
    });
  });

  describe("validatePromoCode", () => {
    it("should return valid promo code", async () => {
      const promo = {
        code: "DISCOUNT10",
        uses: 0,
        maxUses: 3,
        expiresAt: new Date(Date.now() + 100000),
        event: { id: "1" },
      } as PromoCode;

      promoRepo.findOne.mockResolvedValue(promo);

      const result = await service.validatePromoCode("DISCOUNT10", "1");
      expect(result).toBe(promo);
    });

    it("should throw error for expired or overused promo", async () => {
      const expiredPromo = {
        code: "OLD",
        uses: 5,
        maxUses: 5,
        expiresAt: new Date(Date.now() - 1000),
        event: { id: "1" },
      } as PromoCode;

      promoRepo.findOne.mockResolvedValue(expiredPromo);

      await expect(service.validatePromoCode("OLD", "1")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("incrementUsage", () => {
    it("should increment promo usage", async () => {
      const promo = { uses: 2 } as PromoCode;
      promoRepo.save.mockResolvedValue({ ...promo, uses: 3 });

      await service.incrementUsage(promo);
      expect(promo.uses).toBe(3);
      expect(promoRepo.save).toHaveBeenCalledWith(promo);
    });
  });
});
