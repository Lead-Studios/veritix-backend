import { IsString, IsOptional, IsBoolean, IsArray, IsEnum, IsNumber, IsDateString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PollStatus, PollType } from '../entities/poll.entity';

export class UpdatePollDto {
  @ApiPropertyOptional({ description: 'Poll title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Poll description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Poll type', enum: PollType })
  @IsOptional()
  @IsEnum(PollType)
  type?: PollType;

  @ApiPropertyOptional({ description: 'Poll status', enum: PollStatus })
  @IsOptional()
  @IsEnum(PollStatus)
  status?: PollStatus;

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

  @ApiPropertyOptional({ description: 'Pin poll' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: 'Poll tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Moderation note', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  moderationNote?: string;
}
