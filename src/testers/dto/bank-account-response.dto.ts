import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BankAccountStatus } from '../entities/bank-account.entity';

export class BankAccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  bankName: string;

  @ApiProperty()
  accountHolderName: string;

  @ApiProperty({ example: '6789' })
  accountNumberLast4: string;

  @ApiProperty()
  routingNumber: string;

  @ApiProperty({ enum: BankAccountStatus })
  status: BankAccountStatus;

  @ApiPropertyOptional()
  verificationReference?: string | null;

  @ApiPropertyOptional()
  verifiedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;
}
