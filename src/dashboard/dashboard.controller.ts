import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';
import { RoleDecorator } from 'security/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/users-roles.enum';
import { RolesGuard } from 'security/guards/rolesGuard/roles.guard';
import { EventDashboardService } from './dashboard.service';

@Controller('dashboard/events')
export class EventDashboardController {
  constructor(private readonly eventDashboardService: EventDashboardService) {}

  @Get(':eventId')
  @RoleDecorator(UserRole.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getEventDashboard
  (@Param('eventId') eventId: string
) {
    return this.eventDashboardService.getDashboardMetrics(eventId);
  }
}
