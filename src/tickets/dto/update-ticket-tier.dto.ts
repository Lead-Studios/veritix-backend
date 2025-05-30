import { PartialType, ApiProperty } from "@nestjs/swagger"
import { CreateTicketTierDto } from "./create-ticket-tier.dto"
import { IsOptional, IsInt, Min } from "class-validator"
import { Type } from "class-transformer"

export class UpdateTicketTierDto extends PartialType(CreateTicketTierDto) {
  @ApiProperty({
    description: "Number of tickets already sold (read-only, managed by system)",
    example: 25,
    readOnly: true,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly soldQuantity?: number
}
