import { IsString, IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class CreateEventDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsDateString()
  date: string;

  @IsDateString()
  closingDate: string;

  @IsString()
  description: string;

  @IsString()
  country: string;

  @IsString()
  state: string;

  @IsString()
  street: string;

  @IsString()
  localGovernment: string;

  @IsOptional()
  @IsString()
  direction?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsBoolean()
  hideLocation: boolean;

  @IsBoolean()
  comingSoon: boolean;

  @IsBoolean()
  transactionCharge: boolean;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  twitter?: string;

  @IsOptional()
  @IsString()
  instagram?: string;
}
