import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketHistory } from './entities/ticket-history.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketHistoryResource } from './resources/ticket-history.resource';
import { TicketReceiptResource } from './resources/ticket-receipt.resource';
import { PdfService } from './pdf/pdf.service';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(TicketHistory)
    private readonly ticketHistoryRepo: Repository<TicketHistory>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    private readonly pdfService: PdfService,
  ) {}

  async getUserTicketHistory(userId: string) {
    const histories = await this.ticketHistoryRepo.find({ where: { user: { id: userId } }, relations: ['ticket', 'user'] });
    return TicketHistoryResource.toArray(histories);
  }

  async getSingleTicketHistory(userId: string, id: string) {
    const history = await this.ticketHistoryRepo.findOne({ where: { id, user: { id: userId } }, relations: ['ticket', 'user'] });
    if (!history) throw new NotFoundException('Ticket history not found');
    return TicketHistoryResource.toResponse(history);
  }

  async getTicketDetails(id: string) {
    const history = await this.ticketHistoryRepo.findOne({ where: { id }, relations: ['ticket', 'user'] });
    if (!history) throw new NotFoundException('Ticket history not found');
    return TicketHistoryResource.toResponse(history);
  }

  async getTicketReceipt(id: string) {
    const history = await this.ticketHistoryRepo.findOne({ where: { id }, relations: ['ticket', 'user'] });
    if (!history) throw new NotFoundException('Ticket history not found');
    return TicketReceiptResource.toResponse(history);
  }

  async downloadTicketReceiptPdf(id: string): Promise<Buffer> {
    const history = await this.ticketHistoryRepo.findOne({ where: { id }, relations: ['ticket', 'user'] });
    if (!history) throw new NotFoundException('Ticket history not found');
    return this.pdfService.generateReceiptPdf(TicketReceiptResource.toResponse(history));
  }
} 