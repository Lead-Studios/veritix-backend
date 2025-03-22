import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Sponsor } from '../sponsor.entity';
import { CreateSponsorDto } from '../dtos/create-sponsor.dto';
import { UpdateSponsorDto } from '../dtos/update-sponsor.dto';
import { CreateSponsorsProvider } from './create-sponsors-provider';
import { FindAllSponsorsProvider } from './find-all-sponsors-provider';
import { FindOneSponsorProvider } from './find-one-sponsor-provider';
import { FindSponsorsByEventProvider } from './find-sponsors-by-event-provider';
import { UpdateSponsorsProvider } from './update-sponsors-provider';
import { RemoveSponsorsProvider } from './remove-sponsors-provider';

/**
 * Seneral Service for all sponsors business logic.
 */
@Injectable()
export class SponsorsService {
  constructor(
    private readonly createSponsorsProvider: CreateSponsorsProvider,

    private readonly findAllSponsorsProvider: FindAllSponsorsProvider,

    private readonly findOneSponsorProvider: FindOneSponsorProvider,

    private readonly findSponsorsByEventProvider: FindSponsorsByEventProvider,
    
    private readonly updateSponsorsProvider: UpdateSponsorsProvider,

    private readonly removeSponsorsProvider: RemoveSponsorsProvider,
  ) {}

  public async createSponsors(createSponsorDto: CreateSponsorDto) {
    this.createSponsorsProvider.createSponsor(createSponsorDto);
  }

  public async findAllSponsors() {
    this.findAllSponsorsProvider.findAllSponsors();
  }

  async findOneSponsor(id: number) {
    this.findOneSponsorProvider.findOneSponsor(id);
  }

  async findSponsorsByEvent(eventId: number): Promise<Sponsor[]> {
    return this.findSponsorsByEventProvider.findByEvent(eventId);
  }

  async updateSponsor(
    id: number,
    updateSponsorDto: UpdateSponsorDto,
  ): Promise<Sponsor> {
    return this.updateSponsorsProvider.updateSponsor(id, updateSponsorDto)
  }

  async removeSponsor(id: number): Promise<void> {
    return this.removeSponsorsProvider.removeSponsor(id)
  }
}
