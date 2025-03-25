import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Event } from 'src/events/entities/event.entity';
import { Ticket } from 'src/tickets/entities/ticket.entity';
import { CampaignService } from './campaign.service';
import { AnalyticsResponseDto } from '../dto/analytics-response.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    
    private campaignService: CampaignService
  ) {}

  async getAnalytics(): Promise<AnalyticsResponseDto> {
    try {
      this.logger.log('Retrieving dashboard analytics');
      
      // Get user statistics
      const totalUsers = await this.usersRepository.count();
      const activeUsers = await this.usersRepository.count({ where: { isActive: true } });
      
      // Get event statistics
      const totalEvents = await this.eventsRepository.count({ where: { isArchived: false } });
      
      // Get ticket statistics
      const tickets = await this.ticketsRepository.find();
      const totalTicketsSold = tickets.length;
      
      // Calculate total revenue
      const totalRevenue = tickets.reduce((sum, ticket) => sum + Number(ticket.price), 0);
      
      // Get unresolved tickets (assuming a ticket is unresolved if it's reserved but has no transactionId)
      const unresolvedTickets = await this.ticketsRepository.count({
        where: {
          isReserved: true,
          transactionId: null
        }
      });
      
      // Get campaign statistics
      const campaignStats = await this.campaignService.getCampaignStatistics();
      
      // Return analytics data
      return {
        totalUsers,
        activeUsers,
        totalEvents,
        totalTicketsSold,
        totalRevenue,
        unresolvedTickets,
        campaignStats,
        generatedAt: new Date()
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve analytics: ${error.message}`, error.stack);
      throw error;
    }
  }
} 