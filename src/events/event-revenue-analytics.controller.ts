import { 
    Controller, 
    Get, 
    Param, 
    Query, 
    UseGuards 
  } from '@nestjs/common';
  import { EventRevenueAnalyticsService, TimeFilter } from './event-revenue-analytics.service';
  import { AuthGuard } from '@nestjs/passport'; // Assuming you're using Passport for authentication
import { RolesGuard } from 'security/guards/rolesGuard/roles.guard';
import { RoleDecorator } from 'security/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/users-roles.enum';

  
  @Controller('analytics/events')
  @UseGuards(AuthGuard('jwt'), RolesGuard
  ) // Apply authentication and role-based guards
  export class EventRevenueAnalyticsController {
    constructor(
      private readonly eventRevenueService: EventRevenueAnalyticsService
    ) {}
  
    @Get(':eventId/revenue')
    @RoleDecorator(UserRole.Admin, UserRole.User) // Restrict access to specific roles
    async getEventRevenue(
      @Param('eventId') eventId: string,
      @Query('filter') filter?: TimeFilter
    ) {
      if (filter) {
        // Return filtered revenue
        return {
          revenue: await this.eventRevenueService.calculateFilteredRevenue(eventId, filter)
        };
      }
      
      // Return total revenue
      return {
        revenue: await this.eventRevenueService.calculateTotalRevenue(eventId)
      };
    }
  
    @Get(':eventId/profit')
    @RoleDecorator(UserRole.Admin, UserRole.User) // Restrict access to specific roles
    async getEventProfit(
      @Param('eventId') eventId: string,
      @Query('filter') filter?: TimeFilter
    ) {
      if (filter) {
        // Return filtered profit
        return {
          profit: await this.eventRevenueService.calculateFilteredProfit(eventId, filter)
        };
      }
      
      // Return total profit
      return {
        profit: await this.eventRevenueService.calculateTotalProfit(eventId)
      };
    }
  }