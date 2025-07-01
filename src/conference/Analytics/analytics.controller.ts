
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from '../Analytics/analytics.service';
import { JwtAuthGuard } from "../../../security/guards/jwt-auth.guard";
import { RolesGuard } from "../../../security/guards/rolesGuard/roles.guard";
import { RoleDecorator } from '../../../security/decorators/roles.decorator';
import { UserRole } from "src/common/enums/users-roles.enum";

@Controller('analytics/conferences/:conferenceId')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('revenue')
  @RoleDecorator(UserRole.Admin, UserRole.Organizer)
  getRevenue(
    @Param('conferenceId') conferenceId: string,
    @Query('filter') filter?: 'daily' | 'weekly' | 'monthly' | 'yearly',
  ) {
    return this.analyticsService.getRevenue(Number(conferenceId), filter);
  }

  @Get('profit')
  @RoleDecorator(UserRole.Admin, UserRole.Organizer)
  getProfit(
    @Param('conferenceId') conferenceId: string,
    @Query('filter') filter?: 'daily' | 'weekly' | 'monthly' | 'yearly',
  ) {
    return this.analyticsService.getProfit(Number(conferenceId), filter);
  }
}
