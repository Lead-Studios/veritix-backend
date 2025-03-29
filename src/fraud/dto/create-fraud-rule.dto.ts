import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional } from "class-validator"

export class CreateFraudRuleDto {
  @IsString()
  @IsOptional()
  id?: string

  @IsString()
  name: string

  @IsString()
  description: string

  @IsBoolean()
  enabled: boolean

  @IsNumber()
  threshold: number

  @IsNumber()
  weight: number

  @IsEnum(["flag", "block"])
  action: "flag" | "block"
}

