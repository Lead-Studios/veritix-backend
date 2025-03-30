import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional } from "class-validator"

export class UpdateFraudRuleDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsBoolean()
  @IsOptional()
  enabled?: boolean

  @IsNumber()
  @IsOptional()
  threshold?: number

  @IsNumber()
  @IsOptional()
  weight?: number

  @IsEnum(["flag", "block"])
  @IsOptional()
  action?: "flag" | "block"
}

