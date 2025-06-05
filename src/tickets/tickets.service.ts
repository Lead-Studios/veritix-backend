import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Ticket } from "./entities/ticket.entity";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { PdfService } from "src/utils/pdf.service";
import { ConferenceService } from "src/conference/providers/conference.service";
import { User } from "src/users/entities/user.entity";
import { UpdateTicketDto } from "./dto/update-ticket.dto";
import { Receipt } from "./entities/receipt.entity";
import { TicketPurchaseDto } from "./dto/ticket-purchase.dto";
import { ReceiptDto } from "./dto/receipt.dto";
import { Conference } from "../conference/entities/conference.entity";
import { StripePaymentService } from "src/payment/services/stripe-payment.service";
import { PromoCodeService } from "src/promo-code/providers/promo-code.service";
import { createEvent } from 'ics';


@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly pdfService: PdfService,

    private readonly conferenceService: ConferenceService,

    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,

    @InjectRepository(Conference)
    private readonly conferenceRepository: Repository<Conference>,

    private readonly stripeService: StripePaymentService,

    private readonly promoCodeService: PromoCodeService,
  ) {}

  //FN TO CREATE A TICKET ONLY BY ORGANIZERS
  public async createTicket(
    createTicketDto: CreateTicketDto,
    user: User,
  ): Promise<Ticket> {
    const conference = await this.conferenceService.findOne(
      createTicketDto.eventId,
    );
    if (!conference || conference.organizerId !== user.id) {
      throw new ForbiddenException(
        "You do not have permission to create tickets for this conference",
      );
    }

    const ticket = this.ticketRepository.create(createTicketDto);
    return await this.ticketRepository.save(ticket);
  }

  //
  public async getAllTickets(): Promise<Ticket[]> {
    return this.ticketRepository.find();
  }

  async getTicketById(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    return ticket;
  }

  async getTicketByIDAndEvent(id: string, eventId: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: {
        id,
        event: { id: eventId },
      },
      relations: ["event"],
    });
    return ticket;
  }

  async getTicketsByEvent(eventId: string): Promise<Ticket[]> {
    return this.ticketRepository.find({ where: { event: { id: eventId } } });
  }

  //FN TO UPDATE A TICKET
  public async updateTicket(
    id: string,
    updateTicketDto: UpdateTicketDto,
    user: User,
  ): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    const conference = await this.conferenceService.findOne(
      ticket.conferenceId,
    );
    if (conference.organizerId !== user.id) {
      throw new ForbiddenException(
        "You do not have permission to update this ticket",
      );
    }

    Object.assign(ticket, updateTicketDto);
    return this.ticketRepository.save(ticket);
  }

  //FN TO DELETE A TICKET ONLY BY ORGANIZERS
  public async deleteTicket(id: string, user: User): Promise<void> {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    const conference = await this.conferenceService.findOne(ticket.eventId);
    if (conference.organizerId !== user.id) {
      throw new ForbiddenException(
        "You do not have permission to delete this ticket",
      );
    }

    await this.ticketRepository.remove(ticket);
  }

  //fn to get all ticket history for a user
  public async getUserTicketHistory(userId: string): Promise<Ticket[]> {
    return this.ticketRepository.find({
      where: { userId },
      relations: ["event"],
      order: { purchaseDate: "DESC" },
    });
  }

  // fn to get a single ticket history by ID
  public async getUserTicketById(userId: string, id: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id, userId },
      relations: ["event"],
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    return ticket;
  }

  // fn to get ticket details
  public async getTicketDetails(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ["event"],
    });
    if (!ticket) throw new NotFoundException("Ticket details not found");
    return ticket;
  }

  //fn to generat ticket
  public async generateTicketReceipt(id: string): Promise<string> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ["event"],
    });

    if (!ticket) throw new NotFoundException("Ticket not found");

    return this.pdfService.generateTicketReceipt(ticket);
  }

  async purchaseTickets(
  userId: string,
  purchaseDto: TicketPurchaseDto,
): Promise<ReceiptDto> {
  return await this.ticketRepository.manager.transaction(async (manager) => {
    const conference = await manager.findOne(Conference, {
      where: { id: purchaseDto.conferenceId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!conference) {
      throw new NotFoundException('Conference not found');
    }

    const ticket = await manager.findOne(Ticket, {
      where: { conference: { id: conference.id } },
    });

    if (!ticket) {
      throw new NotFoundException('No tickets available for this conference');
    }

    // ✳️ Apply promo code discount if provided
    let discount = 0;
    if (purchaseDto.promoCode) {
      const promo = await this.promoCodeService.validatePromoCode(
        purchaseDto.promoCode,
        conference.id,
      );
      discount = promo.discount;
      await this.promoCodeService.incrementUsage(promo);
    }

    // ✳️ Adjust total amount with discount
    const pricePerTicket = ticket.price - discount;
    const totalAmount = pricePerTicket * purchaseDto.ticketQuantity;

    const paymentSuccessful = await this.stripeService.processPayment(
      totalAmount,
      purchaseDto.billingDetails,
    );

    if (!paymentSuccessful) {
      throw new BadRequestException('Payment not completed');
    }

    const newTicket = manager.create(Ticket, {
      conference: conference,
      userId,
      quantity: purchaseDto.ticketQuantity,
      pricePerTicket,
      totalAmount,
      isPaid: true,
    });

    await manager.save(Ticket, newTicket);

    const receipt = manager.create(Receipt, {
      ticketId: newTicket.id,
      userFullName: purchaseDto.billingDetails.fullName,
      userEmail: purchaseDto.billingDetails.email,
      conferenceName: conference.conferenceName,
      conferenceDate: conference.conferenceDate,
      conferenceLocation: `${conference.street}, ${conference.localGovernment}, ${conference.state}, ${conference.country}`,
      ticketQuantity: purchaseDto.ticketQuantity,
      pricePerTicket,
      totalAmount,
      amountPaid: totalAmount,
      transactionDate: new Date(),
    });

    await manager.save(Receipt, receipt);

    newTicket.receiptId = receipt.id;
    await manager.save(Ticket, newTicket);

    return this.mapReceiptToDto(receipt);
  });
}


  async getReceipt(receiptId: string, userId: string): Promise<ReceiptDto> {
    const receipt = await this.receiptRepository.findOne({
      where: { id: receiptId },
      relations: ["ticket"],
    });

    if (!receipt) {
      throw new NotFoundException("Receipt not found");
    }

    if (receipt.ticket.userId !== userId) {
      throw new ForbiddenException(
        "You do not have permission to access this receipt",
      );
    }

    return this.mapReceiptToDto(receipt);
  }

  private mapReceiptToDto(receipt: Receipt): ReceiptDto {
    return {
      receiptId: receipt.id,
      userFullName: receipt.userFullName,
      userEmail: receipt.userEmail,
      conferenceName: receipt.conferenceName,
      conferenceDate: receipt.conferenceDate,
      conferenceLocation: receipt.conferenceLocation,
      ticketQuantity: receipt.ticketQuantity,
      pricePerTicket: receipt.pricePerTicket,
      totalAmount: receipt.totalAmount,
      amountPaid: receipt.amountPaid,
      transactionDate: receipt.transactionDate,
    };
  }

  async generateICalFile(ticketId: string, token: string): Promise<string> {
  const ticket = await this.ticketRepository.findOne({
    where: { id: ticketId },
    relations: ['user', 'event'],
  });

  if (!ticket) throw new NotFoundException('Ticket not found');

  // Validate token matches ticket's secureToken field
  if (ticket.token !== token) throw new ForbiddenException('Invalid token');

  const event = ticket.event;

  const { error, value } = createEvent({
    title: event.title,
    description: event.description,
    location: event.location,
    start: [
      event.startDate.getFullYear(),
      event.startDate.getMonth() + 1,
      event.startDate.getDate(),
      event.startDate.getHours(),
      event.startDate.getMinutes(),
    ],
    end: [
      event.endDate.getFullYear(),
      event.endDate.getMonth() + 1,
      event.endDate.getDate(),
      event.endDate.getHours(),
      event.endDate.getMinutes(),
    ],
  });

  if (error) {
    throw new InternalServerErrorException('Failed to generate calendar file');
  }

  return value;
}
}
