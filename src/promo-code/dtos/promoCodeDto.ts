import { IsDateString, IsNumber, IsString } from "class-validator";

// CreatePromoCodeDto
export class CreatePromoCodeDto {
  @IsString()
  code: string;

  @IsNumber()
  discount: number;

  @IsNumber()
  maxUses: number;

  @IsDateString()
  expiresAt: Date;
}

// ApplyPromoDto
export class ApplyPromoDto {
  @IsString()
  code: string;

  @IsNumber()
  eventId: string;
}

// PurchaseTicketDto (extend yours if needed)
export class PurchaseTicketDto {
  eventId: number;
  userId: number;
  promoCode?: string;
}