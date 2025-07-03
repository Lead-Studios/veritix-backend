import { Controller, Post, Body, Get, Param, UsePipes, ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { PurchaseTicketDto } from './dto/purchase-ticket.dto';
import { ReceiptDto } from './dto/receipt.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // In a real app, userId would come from the authenticated user
  private getMockUserId(): string {
    return 'user1';
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Purchase one or more tickets for an event' })
  @ApiBody({ type: PurchaseTicketDto })
  @ApiResponse({ status: 201, description: 'Ticket(s) purchased successfully', type: ReceiptDto })
  @ApiResponse({ status: 400, description: 'Validation or business error' })
  @ApiResponse({ status: 404, description: 'User or event not found' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async purchaseTickets(@Body() dto: PurchaseTicketDto): Promise<ReceiptDto> {
    const userId = this.getMockUserId();
    try {
      return await this.ticketsService.purchaseTickets(userId, dto);
    } catch (error) {
      if (error.status && error.response) {
        throw error;
      }
      throw new HttpException(error.message || 'Internal server error', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('receipt/:orderId')
  @ApiOperation({ summary: 'Retrieve the receipt for a confirmed ticket purchase' })
  @ApiParam({ name: 'orderId', required: true })
  @ApiResponse({ status: 200, description: 'Receipt retrieved successfully', type: ReceiptDto })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  async getReceipt(@Param('orderId') orderId: string): Promise<ReceiptDto> {
    const userId = this.getMockUserId();
    try {
      return await this.ticketsService.getReceipt(orderId, userId);
    } catch (error) {
      if (error.status && error.response) {
        throw error;
      }
      throw new HttpException(error.message || 'Internal server error', HttpStatus.NOT_FOUND);
    }
  }
} 