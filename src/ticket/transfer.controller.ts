import { Controller, Post, Get, Body, Param, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TransferService } from './transfer.service';
import { TransferTicketDto } from './dto/transfer-ticket.dto';

@ApiTags('Ticket Transfers')
@Controller('tickets/transfers')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post()
  @ApiOperation({ summary: 'Transfer a ticket to another user' })
  @ApiResponse({ status: 201, description: 'Ticket transferred successfully' })
  @ApiResponse({ status: 400, description: 'Transfer validation failed' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Ticket or user not found' })
  async transferTicket(
    @Body() transferDto: TransferTicketDto,
    @Request() req: any,
  ) {
    const fromUserId = req.user?.id || req.user?.sub; // Adjust based on your auth setup
    return this.transferService.transferTicket(transferDto, fromUserId);
  }

  @Get('ticket/:ticketId/history')
  @ApiOperation({ summary: 'Get transfer history for a specific ticket' })
  @ApiParam({ name: 'ticketId', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Transfer history retrieved successfully' })
  async getTicketTransferHistory(@Param('ticketId') ticketId: string) {
    return this.transferService.getTicketTransferHistory(ticketId);
  }

  @Get('user/my-transfers')
  @ApiOperation({ summary: 'Get all transfers for the current user' })
  @ApiResponse({ status: 200, description: 'User transfers retrieved successfully' })
  async getUserTicketTransfers(@Request() req: any) {
    const userId = req.user?.id || req.user?.sub; // Adjust based on your auth setup
    return this.transferService.getUserTicketTransfers(userId);
  }

  @Get('ticket/:ticketId/eligibility')
  @ApiOperation({ summary: 'Check if a ticket is eligible for transfer' })
  @ApiParam({ name: 'ticketId', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Transfer eligibility checked successfully' })
  async checkTransferEligibility(
    @Param('ticketId') ticketId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub; // Adjust based on your auth setup
    return this.transferService.validateTransferEligibility(ticketId, userId);
  }
}
