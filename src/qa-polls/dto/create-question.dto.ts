import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionPriority } from '../entities/question.entity';

export class CreateQuestionDto {
  @ApiProperty({ description: 'Question content', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ description: 'Question priority', enum: QuestionPriority })
  @IsOptional()
  @IsEnum(QuestionPriority)
  priority?: QuestionPriority;

  @ApiPropertyOptional({ description: 'Submit question anonymously' })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ description: 'Question tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Event ID' })
  @IsString()
  @IsNotEmpty()
  eventId: string;
}
