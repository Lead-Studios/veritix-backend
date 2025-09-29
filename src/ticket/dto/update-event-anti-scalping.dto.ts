import { IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEventAntiScalpingDto {
  @ApiProperty({ description: 'Maximum resale price allowed for tickets', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxResalePrice?: number;

  @ApiProperty({ description: 'Cooldown period in hours between transfers', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  transferCooldownHours?: number;

  @ApiProperty({ description: 'Whether transfers are allowed for this event', required: false })
  @IsOptional()
  @IsBoolean()
  allowTransfers?: boolean;

  @ApiProperty({ description: 'Maximum number of transfers allowed per ticket', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTransfersPerTicket?: number;
}

