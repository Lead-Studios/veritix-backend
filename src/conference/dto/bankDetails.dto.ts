import { IsNotEmpty, IsString } from "class-validator";

export class BankDetailsDto {
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  bankAccountNumber: string;

  @IsString()
  @IsNotEmpty()
  accountName: string;
}