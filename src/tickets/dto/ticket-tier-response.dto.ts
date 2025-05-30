import { ApiProperty } from "@nestjs/swagger"
import { Expose, Transform } from "class-transformer"

export class TicketTierResponseDto {
  @ApiProperty({
    description: "Unique identifier for the ticket tier",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Expose()
  id: string

  @ApiProperty({
    description: "Name of the ticket tier",
    example: "VIP Pass",
  })
  @Expose()
  name: string

  @ApiProperty({
    description: "Description of the ticket tier",
    example: "Premium access with backstage pass",
  })
  @Expose()
  description: string

  @ApiProperty({
    description: "Price per ticket",
    example: 199.99,
  })
  @Expose()
  price: number

  @ApiProperty({
    description: "Total quantity available",
    example: 100,
  })
  @Expose()
  totalQuantity: number

  @ApiProperty({
    description: "Number of tickets sold",
    example: 25,
  })
  @Expose()
  soldQuantity: number

  @ApiProperty({
    description: "Number of tickets still available",
    example: 75,
  })
  @Expose()
  @Transform(({ obj }) => obj.totalQuantity - obj.soldQuantity)
  availableQuantity: number

  @ApiProperty({
    description: "Benefits included with this tier",
    example: ["Backstage access", "Meet & greet"],
  })
  @Expose()
  benefits: string[]

  @ApiProperty({
    description: "Whether the tier is active",
    example: true,
  })
  @Expose()
  isActive: boolean

  @ApiProperty({
    description: "Whether tickets are currently available for purchase",
    example: true,
  })
  @Expose()
  @Transform(({ obj }) => {
    const now = new Date()
    const hasQuantity = obj.totalQuantity - obj.soldQuantity > 0
    const isWithinSalePeriod =
      (!obj.saleStartDate || now >= new Date(obj.saleStartDate)) &&
      (!obj.saleEndDate || now <= new Date(obj.saleEndDate))

    return obj.isActive && hasQuantity && isWithinSalePeriod
  })
  isAvailable: boolean

  @ApiProperty({
    description: "Whether this tier is sold out",
    example: false,
  })
  @Expose()
  @Transform(({ obj }) => obj.soldQuantity >= obj.totalQuantity)
  isSoldOut: boolean

  @ApiProperty({
    description: "Sale start date",
    example: "2025-01-01T00:00:00Z",
    required: false,
  })
  @Expose()
  saleStartDate?: Date

  @ApiProperty({
    description: "Sale end date",
    example: "2025-12-31T23:59:59Z",
    required: false,
  })
  @Expose()
  saleEndDate?: Date

  @ApiProperty({
    description: "Maximum tickets per user",
    example: 4,
    required: false,
  })
  @Expose()
  maxPerUser?: number

  @ApiProperty({
    description: "Sort order",
    example: 1,
  })
  @Expose()
  sortOrder: number

  @ApiProperty({
    description: "Creation timestamp",
    example: "2025-01-01T00:00:00Z",
  })
  @Expose()
  createdAt: Date

  @ApiProperty({
    description: "Last update timestamp",
    example: "2025-01-01T00:00:00Z",
  })
  @Expose()
  updatedAt: Date
}
