import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VotePollDto {
  @ApiProperty({ description: 'Poll ID' })
  @IsString()
  @IsNotEmpty()
  pollId: string;

  @ApiPropertyOptional({ description: 'Selected option IDs for multiple choice polls', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionIds?: string[];

  @ApiPropertyOptional({ description: 'Text response for text-based polls' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  textResponse?: string;

  @ApiPropertyOptional({ description: 'Rating value for rating polls' })
  @IsOptional()
  @IsNumber()
  ratingValue?: number;

  @ApiPropertyOptional({ description: 'Vote anonymously' })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
