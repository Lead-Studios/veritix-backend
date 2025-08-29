import { IsString, IsOptional, IsBoolean, IsArray, IsEnum, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionPriority, QuestionStatus } from '../entities/question.entity';

export class UpdateQuestionDto {
  @ApiPropertyOptional({ description: 'Question content', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @ApiPropertyOptional({ description: 'Question priority', enum: QuestionPriority })
  @IsOptional()
  @IsEnum(QuestionPriority)
  priority?: QuestionPriority;

  @ApiPropertyOptional({ description: 'Question status', enum: QuestionStatus })
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  @ApiPropertyOptional({ description: 'Answer to the question', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  answer?: string;

  @ApiPropertyOptional({ description: 'Pin question' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: 'Highlight question' })
  @IsOptional()
  @IsBoolean()
  isHighlighted?: boolean;

  @ApiPropertyOptional({ description: 'Question tags', type: [String] })
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
