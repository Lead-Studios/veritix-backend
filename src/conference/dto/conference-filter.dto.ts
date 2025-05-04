import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { ConferenceVisibility } from "../entities/conference.entity";
import { Type } from "class-transformer";

export class ConferenceFilterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(ConferenceVisibility)
  visibility?: ConferenceVisibility;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
