import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { EventDashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "security/guards/jwt-auth.guard";
import { RolesGuard } from "security/guards/rolesGuard/roles.guard";
import { RoleDecorator } from "security/decorators/roles.decorator";
import { UserRole } from "src/common/enums/users-roles.enum";
import { DashboardStatsDto } from "./dto/dashboard-stats.dto";
import { ReportPeriodEnum } from "src/common/enums/report-period.enum";

@ApiTags("Dashboard")
@ApiBearerAuth()
@Controller("dashboard/events")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventDashboardController {
  constructor(private readonly eventDashboardService: EventDashboardService) {}

  // @Get("stats")
  // @RoleDecorator(UserRole.Admin)
  // @ApiOperation({
  //   summary: "Get dashboard statistics",
  //   description: "Retrieve key metrics and statistics for the dashboard",
  // })
  // @ApiQuery({
  //   name: "period",
  //   enum: ReportPeriodEnum,
  //   required: false,
  //   description: "Time period for the statistics",
  // })
  // @ApiQuery({
  //   name: "startDate",
  //   required: false,
  //   type: Date,
  //   description: "Start date for custom period (ISO format)",
  // })
  // @ApiQuery({
  //   name: "endDate",
  //   required: false,
  //   type: Date,
  //   description: "End date for custom period (ISO format)",
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: "Dashboard statistics retrieved successfully",
  //   type: DashboardStatsDto,
  // })
  // @ApiResponse({ status: 401, description: "Unauthorized" })
  // @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  // getStats(
  //   @Query("period") period?: ReportPeriodEnum,
  //   @Query("startDate") startDate?: Date,
  //   @Query("endDate") endDate?: Date,
  // ) {
  //   return this.dashboardService.getStats(period, startDate, endDate);
  // }

  // @Get("revenue")
  // @RoleDecorator(UserRole.Admin)
  // @ApiOperation({
  //   summary: "Get revenue analytics",
  //   description: "Retrieve detailed revenue statistics and trends",
  // })
  // @ApiQuery({
  //   name: "period",
  //   enum: ReportPeriodEnum,
  //   required: false,
  //   description: "Time period for revenue analysis",
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: "Revenue analytics retrieved successfully",
  //   type: DashboardStatsDto,
  // })
  // @ApiResponse({ status: 401, description: "Unauthorized" })
  // @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  // getRevenueAnalytics(@Query("period") period?: ReportPeriodEnum) {
  //   return this.dashboardService.getRevenueAnalytics(period);
  // }

  // @Get("events/performance")
  // @RoleDecorator(UserRole.Admin)
  // @ApiOperation({
  //   summary: "Get event performance metrics",
  //   description: "Retrieve performance metrics for events",
  // })
  // @ApiQuery({
  //   name: "top",
  //   required: false,
  //   type: Number,
  //   description: "Number of top performing events to return",
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: "Event performance metrics retrieved successfully",
  //   type: DashboardStatsDto,
  // })
  // @ApiResponse({ status: 401, description: "Unauthorized" })
  // @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  // getEventPerformance(@Query("top") top?: number) {
  //   return this.dashboardService.getEventPerformance(top);
  // }

  // @Get("tickets/sales")
  // @RoleDecorator(UserRole.Admin)
  // @ApiOperation({
  //   summary: "Get ticket sales analytics",
  //   description: "Retrieve detailed ticket sales statistics and trends",
  // })
  // @ApiQuery({
  //   name: "eventId",
  //   required: false,
  //   type: String,
  //   description: "Filter sales by specific event",
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: "Ticket sales analytics retrieved successfully",
  //   type: DashboardStatsDto,
  // })
  // @ApiResponse({ status: 401, description: "Unauthorized" })
  // @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  // getTicketSalesAnalytics(@Query("eventId") eventId?: string) {
  //   return this.dashboardService.getTicketSalesAnalytics(eventId);
  // }

  @Get(":eventId")
  @RoleDecorator(UserRole.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getEventDashboard(@Param("eventId") eventId: string) {
    return this.eventDashboardService.getDashboardMetrics(eventId);
  }
}
