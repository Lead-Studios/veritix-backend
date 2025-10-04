import { IsUUID } from "class-validator";

export class ReleaseEscrowDto {
  @IsUUID()
  orderId: string;

  // who triggers release (scanner, system, organizer) - optional
  triggeredById?: string;
}
