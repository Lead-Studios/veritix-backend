import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsNotEmpty } from "class-validator"

export class VerifyTicketDto {
  @ApiProperty({
    description: "The ID of the ticket to verify",
    example: "0x123abc",
  })
  @IsString()
  @IsNotEmpty()
  ticketId: string
}

