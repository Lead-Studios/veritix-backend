
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from '../Analytics/analytics.service';
import { JwtAuthGuard } from "../../../security/guards/jwt-auth.guard";
import { RolesGuard } from "../../../security/guards/rolesGuard/roles.guard";
import { Roles } from "../../../security/decorators/roles.decorator";
import { UserRole } from "src/common/enums/users-roles.enum";

@Controller("analytics/conferences/:conferenceId")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("revenue")
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  getRevenue(
    @Param("conferenceId") conferenceId: string,
    @Query("filter") filter?: "daily" | "weekly" | "monthly" | "yearly",
  ) {
    return this.analyticsService.getRevenue(Number(conferenceId), filter);
  }

  @Get("profit")
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  getProfit(
    @Param("conferenceId") conferenceId: string,
    @Query("filter") filter?: "daily" | "weekly" | "monthly" | "yearly",
  ) {
    return this.analyticsService.getProfit(Number(conferenceId), filter);
  }
}
