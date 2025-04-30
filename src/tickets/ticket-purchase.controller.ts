import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    Request,
    HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../security/guards/jwt-auth.guard';
import { CreateTicketPurchaseDto } from './dto/create-ticket-purchase.dto';
import { TicketPurchaseService } from './provider/tickets-purchase.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { PaymentDetails } from '../payment/interfaces/payment-service.interface';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketPurchaseController {
    constructor(
        private readonly ticketPurchaseService: TicketPurchaseService,
    ) {}

    @Post('purchase')
    @ApiOperation({
        summary: 'Purchase tickets',
        description: 'Process a ticket purchase with payment details. Validates ticket availability, processes payment, and creates purchase record.'
    })
    @ApiBody({ 
        schema: {
            type: 'object',
            required: ['createTicketPurchaseDto', 'paymentDetails'],
            properties: {
                createTicketPurchaseDto: {
                    $ref: '#/components/schemas/CreateTicketPurchaseDto'
                },
                paymentDetails: {
                    $ref: '#/components/schemas/PaymentDetails'
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Tickets purchased successfully',
        schema: {
            example: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                receiptId: 'TXN-123456',
                ticketQuantity: 2,
                totalPrice: 199.98,
                transactionDate: '2025-04-30T10:30:00Z'
            }
        }
    })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid purchase request or insufficient tickets' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'User is not authenticated' })
    @ApiResponse({ status: HttpStatus.PAYMENT_REQUIRED, description: 'Payment processing failed' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Ticket or event not found' })
    async purchaseTickets(
        @Request() req,
        @Body() createTicketPurchaseDto: CreateTicketPurchaseDto,
        @Body('paymentDetails') paymentDetails: PaymentDetails,
    ) {
        return this.ticketPurchaseService.purchaseTickets(
            req.user.id,
            createTicketPurchaseDto,
            paymentDetails,
        );
    }

    @Get('receipt/:orderId')
    @ApiOperation({
        summary: 'Get purchase receipt',
        description: 'Retrieve the detailed receipt for a ticket purchase including event, ticket, and billing details'
    })
    @ApiParam({
        name: 'orderId',
        description: 'UUID of the ticket purchase order',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Receipt retrieved successfully',
        schema: {
            example: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                receiptId: 'TXN-123456',
                event: {
                    id: '987fcdeb-89a1-12d3-a456-426614174000',
                    name: 'Summer Music Festival 2025'
                },
                ticket: {
                    name: 'VIP Pass',
                    price: 99.99
                },
                ticketQuantity: 2,
                totalPrice: 199.98,
                billingDetails: {
                    fullName: 'John Doe',
                    email: 'john.doe@example.com'
                },
                transactionDate: '2025-04-30T10:30:00Z'
            }
        }
    })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Receipt not found' })
    @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'User is not authenticated' })
    async getReceipt(@Param('orderId') orderId: string) {
        return this.ticketPurchaseService.getReceipt(orderId);
    }
}