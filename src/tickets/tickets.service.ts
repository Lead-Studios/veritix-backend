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
import { StripeService } from "../payment/stripe.service";
import { Conference } from "../conference/entities/conference.entity";

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

    private readonly stripeService: StripeService,
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
      where: { id: Number(id) },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    return ticket;
  }

  async getTicketByIDAndEvent(id: string, eventId: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: {
        id: Number(id),
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
    id: number,
    updateTicketDto: UpdateTicketDto,
    user: User,
  ): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    const conference = await this.conferenceService.findOne(
      String(ticket.conferenceId),
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
  public async deleteTicket(id: number, user: User): Promise<void> {
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
      where: { id: Number(id), userId },
      relations: ["event"],
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    return ticket;
  }

  // fn to get ticket details
  public async getTicketDetails(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: Number(id) },
      relations: ["event"],
    });
    if (!ticket) throw new NotFoundException("Ticket details not found");
    return ticket;
  }

  //fn to generat ticket
  public async generateTicketReceipt(id: string): Promise<string> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: Number(id) },
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
        lock: { mode: "pessimistic_write" }, // Lock the row to prevent race conditions
      });

      if (!conference) {
        throw new NotFoundException("Conference not found");
      }

      if (conference.availableTickets < purchaseDto.ticketQuantity) {
        throw new BadRequestException("Not enough tickets available");
      }

      // Calculate total amount
      const totalAmount = conference.ticketPrice * purchaseDto.ticketQuantity;

      // Create payment intent with Stripe
      const paymentIntent = await this.stripeService.createPaymentIntent(
        totalAmount,
        "usd",
        purchaseDto.billingDetails,
      );

      // Verify payment status
      const paymentStatus = await this.stripeService.getPaymentIntent(
        paymentIntent.id,
      );
      if (paymentStatus.status !== "succeeded") {
        throw new BadRequestException("Payment not completed");
      }

      // Create ticket record
      const ticket = manager.create(Ticket, {
        conferenceId: conference.id,
        userId,
        quantity: purchaseDto.ticketQuantity,
        pricePerTicket: conference.ticketPrice,
        totalAmount,
        paymentIntentId: paymentIntent.id,
        isPaid: true,
      });

      await manager.save(Ticket, ticket);

      // Update conference available tickets
      conference.availableTickets -= purchaseDto.ticketQuantity;
      await manager.save(Conference, conference);

      // Create receipt
      const receipt = manager.create(Receipt, {
        ticketId: ticket.id,
        userFullName: purchaseDto.billingDetails.fullName,
        userEmail: purchaseDto.billingDetails.email,
        conferenceName: conference.name,
        conferenceDate: conference.date,
        conferenceLocation: conference.location,
        ticketQuantity: purchaseDto.ticketQuantity,
        pricePerTicket: conference.ticketPrice,
        totalAmount,
        amountPaid: totalAmount,
        transactionDate: new Date(),
      });

      await manager.save(Receipt, receipt);

      // Update ticket with receipt ID
      ticket.receiptId = receipt.id;
      await manager.save(Ticket, ticket);

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
}
