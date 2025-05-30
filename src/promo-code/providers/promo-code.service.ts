import { BadRequestException, Injectable } from "@nestjs/common";
import { PromoCode } from "../promoCode.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { CreatePromoCodeDto } from "../dtos/promoCodeDto";
import { Event } from "src/events/entities/event.entity";

// src/promo-code/promo-code.service.ts
@Injectable()
export class PromoCodeService {
  constructor(
    @InjectRepository(PromoCode)
    private promoRepo: Repository<PromoCode>,
    @InjectRepository(Event)
    private eventRepo: Repository<Event>
  ) {}

  async createPromoCode(eventId: string, dto: CreatePromoCodeDto) {
  const event = await this.eventRepo.findOneOrFail({ where: { id: eventId } });
  const promo = this.promoRepo.create({ ...dto, event });
  return this.promoRepo.save(promo);
}

  async validatePromoCode(code: string, eventId: string) {
    const promo = await this.promoRepo.findOne({
      where: { code, event: { id: eventId } },
    });
    if (!promo || promo.expiresAt < new Date() || promo.uses >= promo.maxUses) {
      throw new BadRequestException('Invalid or expired promo code');
    }
    return promo;
  }

  async incrementUsage(promo: PromoCode) {
    promo.uses += 1;
    await this.promoRepo.save(promo);
  }
}