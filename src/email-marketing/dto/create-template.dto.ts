import { IsString, IsOptional, IsEnum, IsArray, IsObject, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateType } from '../entities/email-template.entity';
import { ComponentType } from '../entities/template-component.entity';

export class CreateTemplateComponentDto {
  @IsEnum(ComponentType)
  componentType: ComponentType;

  @IsString()
  name: string;

  @IsObject()
  properties: Record<string, any>;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TemplateType)
  templateType: TemplateType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  preheaderText?: string;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsObject()
  designData: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  variables?: Array<{
    name: string;
    type: string;
    defaultValue?: any;
    description?: string;
  }>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateComponentDto)
  components?: CreateTemplateComponentDto[];

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}
