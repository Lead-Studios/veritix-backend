import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { EventStatus } from '../../enums/event-status.enum';

export class ChangeEventStatusDto {
  @IsEnum(EventStatus)
  status: EventStatus;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  updatedBy?: string;
}
