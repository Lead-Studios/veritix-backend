import { IsOptional, IsString, IsEnum, IsArray, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TemplateType, TemplateStatus } from '../entities/email-template.entity';

export class TemplateQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(TemplateType)
  templateType?: TemplateType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(TemplateStatus)
  status?: TemplateStatus;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  tags?: string[];

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
