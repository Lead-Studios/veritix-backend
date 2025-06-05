import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Event } from "../../events/entities/event.entity";
import { Ticket } from "../../tickets/entities/ticket.entity";
import { CreateTicketPurchaseDto } from "../dto/create-ticket-purchase.dto";
import { PaymentServiceInterface } from "../../payment/interfaces/payment-service.interface";
import { v4 as uuidv4 } from "uuid";
import { TicketPurchase } from "../entities/ticket-pruchase";
import { GroupTicket } from "../entities/group-ticket.entity";
import { UsersService } from "src/users/users.service";
import { TicketService } from "../tickets.service";

@Injectable()
export class TicketPurchaseService {
  constructor(
    @InjectRepository(TicketPurchase)
    private ticketPurchaseRepository: Repository<TicketPurchase>,
    @InjectRepository(GroupTicket)
    private groupTicketRepository: Repository<GroupTicket>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,

    @Inject("PaymentServiceInterface")
    private paymentService: PaymentServiceInterface,

    private userServices: UsersService,
    private ticketServices: TicketService,
  ) {}

  async purchaseTickets(
    userId: string,
    createTicketPurchaseDto: CreateTicketPurchaseDto,
    paymentDetails: any,
  ): Promise<TicketPurchase> {
    // Find ticket and validate availability
    const ticket = await this.ticketServices.getTicketByIDAndEvent(
      createTicketPurchaseDto.ticketId,
      createTicketPurchaseDto.eventId,
    );

    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    // Check ticket availability
    if (ticket.quantity < createTicketPurchaseDto.ticketQuantity) {
      throw new BadRequestException("Not enough tickets available");
    }

    // Calculate total price
    const totalPrice = ticket.price * createTicketPurchaseDto.ticketQuantity;

    // Process payment first
    const paymentSuccessful = await this.paymentService.processPayment(
      totalPrice,
      paymentDetails,
    );

    if (!paymentSuccessful) {
      throw new BadRequestException("Payment processing failed");
    }

    // Find user
    const user = await this.userServices.findOneById(parseInt(userId));

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Generate transaction ID and group code
    const transactionId = uuidv4();
    const groupCode = createTicketPurchaseDto.isGroupBooking
      ? this.generateGroupCode()
      : null;

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
      isGroupBooking: createTicketPurchaseDto.isGroupBooking || false,
      groupCode,
      groupName: createTicketPurchaseDto.groupName,
      groupDescription: createTicketPurchaseDto.groupDescription,
      groupLeaderId: createTicketPurchaseDto.isGroupBooking ? userId : null,
      groupLeader: createTicketPurchaseDto.isGroupBooking ? user : null,
    });

    // Save updated ticket and create purchase record
    await this.ticketRepository.save(ticket);
    const savedPurchase =
      await this.ticketPurchaseRepository.save(ticketPurchase);

    // If it's a group booking, create individual group tickets
    if (createTicketPurchaseDto.isGroupBooking) {
      await this.createGroupTickets(savedPurchase);
    }

    return savedPurchase;
  }

  private async createGroupTickets(purchase: TicketPurchase): Promise<void> {
    const groupTickets = [];

    for (let i = 0; i < purchase.ticketQuantity; i++) {
      const groupTicket = this.groupTicketRepository.create({
        purchase,
        purchaseId: purchase.id,
        ticketCode: this.generateIndividualTicketCode(
          purchase.groupCode,
          i + 1,
        ),
        qrCode: this.generateQRCode(purchase.id, i + 1),
      });
      groupTickets.push(groupTicket);
    }

    await this.groupTicketRepository.save(groupTickets);
  }

  private generateGroupCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `GRP-${timestamp}-${random}`.toUpperCase();
  }

  private generateIndividualTicketCode(
    groupCode: string,
    ticketNumber: number,
  ): string {
    return `${groupCode}-T${ticketNumber.toString().padStart(3, "0")}`;
  }

  private generateQRCode(purchaseId: string, ticketNumber: number): string {
    return `${purchaseId}-${ticketNumber}`;
  }

  async getReceipt(orderId: string): Promise<TicketPurchase> {
    const ticketPurchase = await this.ticketPurchaseRepository.findOne({
      where: { id: orderId },
      relations: ["event", "user", "ticket", "groupTickets", "groupLeader"],
    });

    if (!ticketPurchase) {
      throw new NotFoundException("Receipt not found");
    }

    return ticketPurchase;
  }

  // NEW: Group booking management methods
  async getGroupBookingDetails(groupCode: string): Promise<TicketPurchase> {
    const groupBooking = await this.ticketPurchaseRepository.findOne({
      where: { groupCode },
      relations: ["event", "user", "ticket", "groupTickets", "groupLeader"],
    });

    if (!groupBooking) {
      throw new NotFoundException("Group booking not found");
    }

    return groupBooking;
  }

  async transferGroupTicket(
    ticketId: string,
    transferToUserId: string,
    transferFromUserId: string,
  ): Promise<GroupTicket> {
    const groupTicket = await this.groupTicketRepository.findOne({
      where: { id: ticketId },
      relations: ["purchase", "purchase.groupLeader"],
    });

    if (!groupTicket) {
      throw new NotFoundException("Group ticket not found");
    }

    // Check if the user has permission to transfer (group leader or original assignee)
    const hasPermission =
      groupTicket.purchase.groupLeaderId === transferFromUserId ||
      groupTicket.transferredToUserId === transferFromUserId;

    if (!hasPermission) {
      throw new BadRequestException(
        "You do not have permission to transfer this ticket",
      );
    }

    const transferToUser = await this.userServices.findOneById(
      parseInt(transferToUserId),
    );
    if (!transferToUser) {
      throw new NotFoundException("Transfer recipient not found");
    }

    groupTicket.transferredToUserId = transferToUserId;
    groupTicket.transferredToUser = transferToUser;
    groupTicket.isTransferred = true;
    groupTicket.assignedToName =
      transferToUser.firstName + " " + transferToUser.lastName;
    groupTicket.assignedToEmail = transferToUser.email;

    return await this.groupTicketRepository.save(groupTicket);
  }

  async assignGroupTicket(
    ticketId: string,
    assignToName: string,
    assignToEmail: string,
    assignerId: string,
  ): Promise<GroupTicket> {
    const groupTicket = await this.groupTicketRepository.findOne({
      where: { id: ticketId },
      relations: ["purchase"],
    });

    if (!groupTicket) {
      throw new NotFoundException("Group ticket not found");
    }

    // Check if the user is the group leader
    if (groupTicket.purchase.groupLeaderId !== assignerId) {
      throw new BadRequestException("Only the group leader can assign tickets");
    }

    groupTicket.assignedToName = assignToName;
    groupTicket.assignedToEmail = assignToEmail;

    return await this.groupTicketRepository.save(groupTicket);
  }

  async getGroupTickets(groupCode: string): Promise<GroupTicket[]> {
    const groupBooking = await this.ticketPurchaseRepository.findOne({
      where: { groupCode },
      relations: ["groupTickets", "groupTickets.transferredToUser"],
    });

    if (!groupBooking) {
      throw new NotFoundException("Group booking not found");
    }

    return groupBooking.groupTickets;
  }

  async getUserGroupBookings(userId: string): Promise<TicketPurchase[]> {
    return await this.ticketPurchaseRepository.find({
      where: {
        groupLeaderId: userId,
        isGroupBooking: true,
      },
      relations: ["event", "ticket", "groupTickets"],
      order: { transactionDate: "DESC" },
    });
  }
}
