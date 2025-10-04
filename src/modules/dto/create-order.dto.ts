import { IsUUID, IsNumber } from "class-validator";

export class CreateOrderDto {
  // buyer id can be taken from auth in real app
  buyerId: string;

  @IsUUID()
  ticketId: string;

  @IsNumber()
  amount: number;
}
