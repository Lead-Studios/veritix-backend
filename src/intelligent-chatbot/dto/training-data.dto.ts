import { IsString, IsOptional, IsEnum, IsObject, IsArray, IsNumber } from 'class-validator';
import { TrainingDataType, TrainingDataStatus } from '../entities/chatbot-training-data.entity';

export class CreateTrainingDataDto {
  @IsEnum(TrainingDataType)
  type: TrainingDataType;

  @IsString()
  intent: string;

  @IsString()
  input: string;

  @IsString()
  expectedOutput: string;

  @IsOptional()
  @IsObject()
  entities?: Record<string, any>;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class UpdateTrainingDataDto {
  @IsOptional()
  @IsString()
  input?: string;

  @IsOptional()
  @IsString()
  expectedOutput?: string;

  @IsOptional()
  @IsEnum(TrainingDataStatus)
  status?: TrainingDataStatus;

  @IsOptional()
  @IsObject()
  entities?: Record<string, any>;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class TrainingDataResponseDto {
  id: string;
  type: TrainingDataType;
  intent: string;
  input: string;
  expectedOutput: string;
  entities?: Record<string, any>;
  language: string;
  status: TrainingDataStatus;
  category?: string;
  subcategory?: string;
  tags?: string[];
  usageCount: number;
  successRate: number;
  createdAt: Date;
  updatedAt: Date;
}
