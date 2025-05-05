import { IsUUID, IsNotEmpty } from 'class-validator';

export class GenerateBadgeDto {
  @IsNotEmpty()
  @IsUUID()
  ticketId: string;
}