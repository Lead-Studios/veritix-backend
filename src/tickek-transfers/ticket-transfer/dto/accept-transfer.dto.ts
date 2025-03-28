import { IsNotEmpty, IsString } from "class-validator"

export class AcceptTransferDto {
  @IsString()
  @IsNotEmpty()
  verificationCode: string
}

