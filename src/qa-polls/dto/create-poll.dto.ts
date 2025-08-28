import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsEnum, IsNumber, IsDateString, ValidateNested, ArrayMinSize, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PollType } from '../entities/poll.entity';

export class CreatePollOptionDto {
  @ApiProperty({ description: 'Option text' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text: string;

  @ApiPropertyOptional({ description: 'Option description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Option order' })
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class CreatePollDto {
  @ApiProperty({ description: 'Poll title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Poll description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'Poll type', enum: PollType })
  @IsEnum(PollType)
  type: PollType;

  @ApiPropertyOptional({ description: 'Poll start time' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Poll end time' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ description: 'Allow anonymous voting' })
  @IsOptional()
  @IsBoolean()
  allowAnonymousVoting?: boolean;

  @ApiPropertyOptional({ description: 'Allow multiple votes per user' })
  @IsOptional()
  @IsBoolean()
  allowMultipleVotes?: boolean;

  @ApiPropertyOptional({ description: 'Show results to participants' })
  @IsOptional()
  @IsBoolean()
  showResults?: boolean;

  @ApiPropertyOptional({ description: 'Show results only after voting' })
  @IsOptional()
  @IsBoolean()
  showResultsAfterVoting?: boolean;

  @ApiPropertyOptional({ description: 'Maximum number of choices allowed' })
  @IsOptional()
  @IsNumber()
  maxChoices?: number;

  @ApiPropertyOptional({ description: 'Is this poll required for attendees' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ description: 'Poll tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Event ID' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({ description: 'Poll options', type: [CreatePollOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePollOptionDto)
  @ArrayMinSize(1)
  options: CreatePollOptionDto[];
}
