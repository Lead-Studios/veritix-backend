import { IsNotEmpty, IsString, IsUUID, IsArray, IsOptional } from 'class-validator';

export class CreateTicketDto {
  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsUUID()
  attendeeId: string;

  @IsNotEmpty()
  @IsUUID()
  conferenceId: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sessionIds?: string[];
}