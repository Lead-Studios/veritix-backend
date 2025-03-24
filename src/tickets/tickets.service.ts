import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Ticket } from "./entities/ticket.entity";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { PdfService } from "src/utils/pdf.service";

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>, 

    private readonly pdfService : PdfService
  ) {}

  async createTicket(dto: CreateTicketDto): Promise<Ticket> {
    const ticket = this.ticketRepository.create(dto);
    return this.ticketRepository.save(ticket);
  }

  async getAllTickets(): Promise<Ticket[]> {
    return this.ticketRepository.find();
  }

  async getTicketById(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException("Ticket not found");
    return ticket;
  }

  async getTicketsByEvent(eventId: string): Promise<Ticket[]> {
    return this.ticketRepository.find({ where: { event: { id: eventId } } });
  }

  async updateTicket(
    id: string,
    dto: Partial<CreateTicketDto>,
  ): Promise<Ticket> {
    const ticket = await this.getTicketById(id);
    Object.assign(ticket, dto);
    return this.ticketRepository.save(ticket);
  }

  async deleteTicket(id: string): Promise<void> {
    const result = await this.ticketRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException("Ticket not found");
  }

    //fn to get all ticket history for a user
    public async getUserTicketHistory(userId: string): Promise<Ticket[]> {
      return this.ticketRepository.find({
        where: { userId },
        relations: ['event'],
        order: { purchaseDate: 'DESC' },
      });
    }

     // fn to get a single ticket history by ID
  public async getUserTicketById(userId: string, id: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id, userId },
      relations: ['event'],
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

   // fn to get ticket details
   public async getTicketDetails(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['event'],
    });
    if (!ticket) throw new NotFoundException('Ticket details not found');
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
}
