import { IsUUID, IsString } from "class-validator";

export class RefundDto {
  @IsUUID()
  orderId: string;

  @IsString()
  organizerId: string;

  // optional reason
  reason?: string;
}
