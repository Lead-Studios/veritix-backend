import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('my')
  async findMyTickets(
    @CurrentUser() user: User,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    const parsedPage = Number(page) || 1;
    const parsedPageSize = Number(pageSize) || 20;

    return this.ticketsService.findByUser(user.id, {
      status,
      page: parsedPage,
      pageSize: parsedPageSize,
    });
  }
}
