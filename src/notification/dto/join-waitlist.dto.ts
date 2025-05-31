import { IsNotEmpty, IsNumber } from "class-validator";

export class JoinWaitlistDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsNumber()
  @IsNotEmpty()
  eventId: number;
}
