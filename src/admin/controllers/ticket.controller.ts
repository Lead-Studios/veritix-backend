import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TicketService } from '../services/ticket.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ResolveTicketDto } from '../dtos/resolve-ticket.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post('resolve')
  @ApiOperation({ summary: 'Resolve ticket issue' })
  @ApiBody({ type: ResolveTicketDto })
  resolve(@Body() dto: ResolveTicketDto) {
    return this.ticketService.resolveTicket(dto);
  }
}
