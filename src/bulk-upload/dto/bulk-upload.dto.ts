import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export enum BulkUploadType {
  TICKETS = "tickets",
  ATTENDEES = "attendees",
}

export class BulkUploadDto {
  @ApiProperty({
    description: "Type of bulk upload",
    enum: BulkUploadType,
  })
  @IsEnum(BulkUploadType)
  @IsNotEmpty()
  type: BulkUploadType

  @ApiProperty({
    description: "Event ID for the bulk upload",
  })
  @IsString()
  @IsNotEmpty()
  eventId: string

  @ApiProperty({
    description: "Optional description for the upload batch",
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string
}

export class TicketBulkData {
  ticketType: string
  price: number
  quantity: number
  description?: string
  transferable: boolean
  resellable: boolean
  maxResellPrice?: number
}

export class AttendeeBulkData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  ticketType: string
  specialRequirements?: string
}

export class BulkUploadResult {
  @ApiProperty()
  success: boolean

  @ApiProperty()
  totalRecords: number

  @ApiProperty()
  successfulRecords: number

  @ApiProperty()
  failedRecords: number

  @ApiProperty()
  errors: BulkUploadError[]

  @ApiProperty()
  uploadId: string
}

export class BulkUploadError {
  @ApiProperty()
  row: number

  @ApiProperty()
  field?: string

  @ApiProperty()
  message: string

  @ApiProperty()
  data?: any
}
