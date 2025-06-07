// src/activity-log/dto/create-activity-log.dto.ts
import { IsNumber, IsString, IsOptional, IsObject } from "class-validator";

export class CreateActivityLogDto {
  @IsNumber()
  userId: number;

  @IsString()
  type: string; // e.g., 'CLICK', 'CHECKOUT_ATTEMPT', 'PURCHASE'

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>; // dynamic metadata, like { eventId, itemId, etc. }
}
