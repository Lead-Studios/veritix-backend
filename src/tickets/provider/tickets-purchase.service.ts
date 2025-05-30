import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { CreateTicketPurchaseDto } from '../dto/create-ticket-purchase.dto';
import { PaymentServiceInterface } from '../../payment/interfaces/payment-service.interface';
import { v4 as uuidv4 } from 'uuid';
import { TicketPurchase } from '../entities/ticket-pruchase';
import { UsersService } from 'src/users/users.service';
import { TicketService } from '../tickets.service';
import { TicketTierService } from './ticket-tier.service';

@Injectable()
export class TicketPurchaseService {
  constructor(
    @InjectRepository(TicketPurchase)
    private ticketPurchaseRepository: Repository<TicketPurchase>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,

    @Inject('PaymentServiceInterface')
    private paymentService: PaymentServiceInterface,

    private userServices: UsersService,
    private ticketServices: TicketService,
    private ticketTierService: TicketTierService,
  ) {}

  async purchaseTickets(
    userId: string,
    createTicketPurchaseDto: CreateTicketPurchaseDto,
    paymentDetails: any,
  ): Promise<TicketPurchase> {
    // Find ticket and validate availability
    const ticket = await this.ticketServices.getTicketByIDAndEvent(createTicketPurchaseDto.ticketId, createTicketPurchaseDto.eventId);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check ticket availability
    if (ticket.quantity < createTicketPurchaseDto.ticketQuantity) {
      throw new BadRequestException('Not enough tickets available');
    }

    // Calculate total price
    const totalPrice = ticket.price * createTicketPurchaseDto.ticketQuantity;

    // Process payment first
    const paymentSuccessful = await this.paymentService.processPayment(
      totalPrice,
      paymentDetails,
    );

    if (!paymentSuccessful) {
      throw new BadRequestException('Payment processing failed');
    }

       const queryRunner = this.ticketPurchaseRepository.manager.connection.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // Find ticket tier and validate availability
      const ticketTier = await this.ticketTierService.reserveTickets(
        createTicketPurchaseDto.ticketId,
        createTicketPurchaseDto.ticketQuantity,
        queryRunner,
      )

    // Find user
    const user = await this.userServices.findOneById(parseInt(userId));

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate transaction ID
    const transactionId = uuidv4();

    // Update ticket quantity and add transaction details
    ticket.quantity -= createTicketPurchaseDto.ticketQuantity;
    ticket.transactionId = transactionId;
    ticket.userId = userId;
    ticket.isReserved = ticket.quantity === 0;

    // Create ticket purchase
    const ticketPurchase = this.ticketPurchaseRepository.create({
      receiptId: transactionId,
      user,
      event: ticket.event,
      ticket,
      ticketQuantity: createTicketPurchaseDto.ticketQuantity,
      totalPrice,
      billingDetails: createTicketPurchaseDto.billingDetails,
      addressDetails: createTicketPurchaseDto.addressDetails,
    });

    // Save updated ticket and create purchase record
    await this.ticketRepository.save(ticket);
    const savedPurchase = await this.ticketPurchaseRepository.save(ticketPurchase);

    await queryRunner.commitTransaction();
    return savedPurchase;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getReceipt(orderId: number): Promise<TicketPurchase> {
    const ticketPurchase = await this.ticketPurchaseRepository.findOne({
      where: { id: orderId.toString() },
      relations: ['event', 'user', 'ticket'],
    });

    if (!ticketPurchase) {
      throw new NotFoundException('Receipt not found');
    }

    return ticketPurchase;
  }
}