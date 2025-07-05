import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateTicketTierDto } from "./dto/create-ticket-tier.dto";
import { EventsService } from "../events/events.service";
import { TicketTier } from "./entities/ticket-tier.entity";

@Injectable()
export class TicketTierService {
  constructor(
    @InjectRepository(TicketTier)
    private ticketTierRepo: Repository<TicketTier>,
    private readonly eventsService: EventsService,
  ) {}

  async create(
    eventId: string,
    dto: CreateTicketTierDto,
    userId: string,
  ): Promise<TicketTier> {
    const event = await this.eventsService.findOne(eventId);

    if (!event) throw new NotFoundException("Event not found");
    if (event.ownerId !== userId)
      throw new ForbiddenException("You do not own this event");

    const tier = this.ticketTierRepo.create({ ...dto, eventId });
    return await this.ticketTierRepo.save(tier);
  }

  async findByEvent(eventId: string): Promise<TicketTier[]> {
    return this.ticketTierRepo.find({ where: { eventId } });
  }
}
