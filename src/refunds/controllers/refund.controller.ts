import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
} from '@nestjs/common';
import { RefundService } from '../services/refund.service';
import { CreateRefundDto } from '../dto/create-refund.dto';
import { UpdateRefundDto } from '../dto/update-refund.dto';
import { BulkRefundDto } from '../dto/bulk-refund.dto';

@Controller('refunds')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Post('create')
  async createRefund(createRefundDto: CreateRefundDto) {
    return this.refundService.createRefund(createRefundDto);
  }

  @Post('bulk')
  async processBulkRefunds(bulkRefundDto: BulkRefundDto) {
    return this.refundService.processBulkRefunds(bulkRefundDto);
  }

  @Post('event/:eventId/cancel-all')
  async processEventCancellationRefunds(
    @Param('eventId') eventId: string,
    @Query('organizerId') organizerId: string,
    @Query('refundPercentage') refundPercentage?: number,
    @Query('processingFee') processingFee?: number,
  ) {
    return this.refundService.processEventCancellationRefunds(
      eventId,
      organizerId,
      refundPercentage ? Number(refundPercentage) : 100,
      processingFee ? Number(processingFee) : 0,
    );
  }

  @Get(':refundId')
  async getRefund(@Param('refundId') refundId: string) {
    return this.refundService.getRefund(refundId);
  }

  @Get('event/:eventId')
  async getRefundsByEvent(
    @Param('eventId') eventId: string,
    @Query('organizerId') organizerId: string,
  ) {
    return this.refundService.getRefundsByEvent(eventId, organizerId);
  }

  @Get('purchaser/:purchaserId')
  async getRefundsByPurchaser(@Param('purchaserId') purchaserId: string) {
    return this.refundService.getRefundsByPurchaser(purchaserId);
  }

  @Get('event/:eventId/stats')
  async getRefundStats(
    @Param('eventId') eventId: string,
    @Query('organizerId') organizerId: string,
  ) {
    return this.refundService.getRefundStats(eventId, organizerId);
  }

  @Patch(':refundId/process')
  async processRefund(
    @Param('refundId') refundId: string,
    updateDto: UpdateRefundDto,
  ) {
    return this.refundService.processRefund(refundId, updateDto);
  }

  @Delete(':refundId')
  async cancelRefund(
    @Param('refundId') refundId: string,
    @Query('requesterId') requesterId: string,
  ) {
    return this.refundService.cancelRefund(refundId, requesterId);
  }
}

// Additional controller for the specific endpoint requested
@Controller('tickets')
export class TicketRefundController {
  constructor(private readonly refundService: RefundService) {}

  @Post('refund/:ticketId')
  async refundTicket(
    @Param('ticketId') ticketId: string,
    createRefundDto: any,
  ) {
    const fullRefundDto: any = {
      ...createRefundDto,
      ticketId,
    };
    return this.refundService.createRefund(fullRefundDto);
  }
}
