import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RSVP } from './rsvp.entity';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Event } from 'src/event/entities/event.entity';

@Injectable()
export class RsvpService {
  ticketRepo: any;
  constructor(
    @InjectRepository(RSVP) private rsvpRepo: Repository<RSVP>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
  ) {}

  async createRSVP(eventId: string, user: User): Promise<RSVP> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });

    if (!event) throw new NotFoundException('Event not found');

    if (!event.isFree) {
      throw new BadRequestException('Only free events support RSVP');
    }

    if (event.currentRSVPs >= event.capacity) {
      throw new BadRequestException('Event has reached max capacity');
    }

    const alreadyRSVPd = await this.rsvpRepo.findOne({
      where: { event: { id: eventId }, user: { id: user.id } },
    });

    if (alreadyRSVPd)
      throw new BadRequestException('Already RSVP’d to this event');

    const rsvp = this.rsvpRepo.create({ user, event });
    await this.rsvpRepo.save(rsvp);

    event.currentRSVPs += 1;
    await this.eventRepo.save(event);

    return rsvp;
  }

  async convertRSVPToTicket(rsvpId: string) {
    const rsvp = await this.rsvpRepo.findOne({
      where: { id: rsvpId },
      relations: ['event', 'user'],
    });

    if (!rsvp) throw new NotFoundException('RSVP not found');

    const ticket = this.ticketRepo.create({
      event: rsvp.event,
      user: rsvp.user,
      type: 'FREE',
      source: 'RSVP',
    });

    return this.ticketRepo.save(ticket);
  }
}
