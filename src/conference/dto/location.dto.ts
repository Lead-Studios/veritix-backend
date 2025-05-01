import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class LocationDto {
  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  localGovernment: string;

  @IsString()
  @IsOptional()
  direction?: string;

  @IsBoolean()
  @IsOptional()
  hideLocation?: boolean;
}