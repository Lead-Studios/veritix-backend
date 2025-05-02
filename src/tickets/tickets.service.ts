import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Ticket } from "./entities/ticket.entity";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { PdfService } from "src/utils/pdf.service";
import { ConferenceService } from "src/conference/providers/conference.service";
import { User } from "src/users/entities/user.entity";
import { UpdateTicketDto } from "./dto/update-ticket.dto";

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly pdfService: PdfService,

    private readonly conferenceService: ConferenceService,
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
}
