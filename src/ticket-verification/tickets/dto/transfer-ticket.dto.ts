import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsNotEmpty, IsEthereumAddress } from "class-validator"

export class TransferTicketDto {
  @ApiProperty({
    description: "The ID of the ticket to transfer",
    example: "0x123abc",
  })
  @IsString()
  @IsNotEmpty()
  ticketId: string

  @ApiProperty({
    description: "The Ethereum address of the new owner",
    example: "0x89D35C32d1Cd34F7e4a397D32d73183a9755F535",
  })
  @IsEthereumAddress()
  @IsNotEmpty()
  newOwner: string
}

