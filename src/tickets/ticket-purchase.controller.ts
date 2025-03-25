import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../security/guards/jwt-auth.guard';
import { CreateTicketPurchaseDto } from './dto/create-ticket-purchase.dto';
import { TicketPurchaseService } from './provider/tickets-purchase.service';
  
  @Controller('tickets')
  @UseGuards(JwtAuthGuard)
  export class TicketPurchaseController {
    constructor(
      private readonly ticketPurchaseService: TicketPurchaseService,
    ) {}
  
    @Post('purchase')
    async purchaseTickets(
      @Request() req,
      @Body() createTicketPurchaseDto: CreateTicketPurchaseDto,
      @Body('paymentDetails') paymentDetails: any,
    ) {
      return this.ticketPurchaseService.purchaseTickets(
        req.user.id,
        createTicketPurchaseDto,
        paymentDetails,
      );
    }
  
    @Get('receipt/:orderId')
    async getReceipt(@Param('orderId') orderId: string) {
      return this.ticketPurchaseService.getReceipt(orderId);
    }
  }