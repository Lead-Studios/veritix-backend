import { Body, Controller, Param, Post } from "@nestjs/common";
import { PromoCodeService } from "./providers/promo-code.service";
import { CreatePromoCodeDto } from "./dtos/promoCodeDto";

@Controller('events/:id/promo-codes')
export class PromoCodeController {
  constructor(private readonly promoService: PromoCodeService) {}

  @Post()
  createPromo(@Param('id') id: string, @Body() dto: CreatePromoCodeDto) {
    return this.promoService.createPromoCode(id, dto);
  }
}