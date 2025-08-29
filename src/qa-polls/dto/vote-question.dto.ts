import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VoteType } from '../entities/question-vote.entity';

export class VoteQuestionDto {
  @ApiProperty({ description: 'Vote type', enum: VoteType })
  @IsEnum(VoteType)
  @IsNotEmpty()
  type: VoteType;

  @ApiProperty({ description: 'Question ID' })
  @IsString()
  @IsNotEmpty()
  questionId: string;
}
