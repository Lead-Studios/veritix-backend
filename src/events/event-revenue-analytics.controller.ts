import { 
  Controller, 
  Get, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { EventRevenueAnalyticsService, TimeFilter } from './event-revenue-analytics.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'security/guards/rolesGuard/roles.guard';
import { RoleDecorator } from 'security/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/users-roles.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags("Event Analytics")
@ApiBearerAuth()
@Controller("analytics/events")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class EventRevenueAnalyticsController {
  constructor(
    private readonly eventRevenueService: EventRevenueAnalyticsService,
  ) {}

  @Get(":eventId/revenue")
  @RoleDecorator(UserRole.Admin, UserRole.User)
  @ApiOperation({
    summary: "Get event revenue",
    description:
      "Retrieve revenue analytics for a specific event with optional time filtering",
  })
  @ApiParam({
    name: "eventId",
    description: "ID of the event to analyze",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiQuery({
    name: "filter",
    enum: TimeFilter,
    required: false,
    description: "Time period filter for the analytics",
    example: TimeFilter.MONTHLY,
  })
  @ApiResponse({
    status: 200,
    description: "Revenue analytics retrieved successfully",
    schema: {
      properties: {
        totalRevenue: { type: "number", example: 15000.5 },
        ticketsSold: { type: "number", example: 150 },
        averageTicketPrice: { type: "number", example: 100.0 },
        period: { type: "string", example: "MONTH" },
        revenueByDay: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string", example: "2025-04-15" },
              revenue: { type: "number", example: 1200.0 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient privileges",
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getEventRevenue(
    @Param("eventId") eventId: string,
    @Query("filter") filter?: TimeFilter,
  ) {
    return this.eventRevenueService.calculateFilteredRevenue(eventId, filter);
  }

  @Get(":eventId/profit")
  @RoleDecorator(UserRole.Admin, UserRole.User)
  @ApiOperation({
    summary: "Get event profit",
    description:
      "Retrieve profit analytics for a specific event with optional time filtering",
  })
  @ApiParam({
    name: "eventId",
    description: "ID of the event to analyze",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiQuery({
    name: "filter",
    enum: TimeFilter,
    required: false,
    description: "Time period filter for the analytics",
    example: TimeFilter.MONTHLY,
  })
  @ApiResponse({
    status: 200,
    description: "Profit analytics retrieved successfully",
    schema: {
      properties: {
        totalRevenue: { type: "number", example: 15000.5 },
        totalCosts: { type: "number", example: 5000.0 },
        netProfit: { type: "number", example: 10000.5 },
        profitMargin: { type: "number", example: 66.67 },
        period: { type: "string", example: "MONTHLY" },
        profitByDay: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string", example: "2025-04-15" },
              profit: { type: "number", example: 800.0 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - Insufficient privileges",
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getEventProfit(
    @Param("eventId") eventId: string,
    @Query("filter") filter?: TimeFilter,
  ) {
    return this.eventRevenueService.calculateFilteredProfit(eventId, filter);
  }
}
