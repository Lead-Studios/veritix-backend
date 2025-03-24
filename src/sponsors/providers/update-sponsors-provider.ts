import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Sponsor } from '../sponsor.entity';
import { Repository } from 'typeorm';
import { UpdateSponsorDto } from '../dtos/update-sponsor.dto';

/**
 * Service provider for updating sponsors info.
 */
@Injectable()
export class UpdateSponsorsProvider {
  constructor(
    @InjectRepository(Sponsor)
    private sponsorsRepository: Repository<Sponsor>,
  ) {}

  /**
   * Updates sponsors info in the database.
   *
   * @returns {Promise<Sponsor>}
   * @throws {NotFoundException} If an error occurs while geting id of sponsor.
   * @throws {InternalServerErrorException} If an error occurs while fetching sponsors.
   */
  async updateSponsor(
    id: number,
    updateSponsorDto: UpdateSponsorDto,
  ): Promise<Sponsor> {
    try {
      const sponsor = await this.sponsorsRepository.findOneBy({ id });
      if (!sponsor)
        throw new NotFoundException(`Sponsor with ID ${id} not found`);

      sponsor.brandImage = updateSponsorDto.brandImage ?? sponsor.brandImage;
      sponsor.brandName = updateSponsorDto.brandName ?? sponsor.brandName;
      sponsor.brandWebsite =
        updateSponsorDto.brandWebsite ?? sponsor.brandWebsite;
      sponsor.socialMediaLinks =
        updateSponsorDto.socialMediaLinks ?? sponsor.socialMediaLinks;

      return await this.sponsorsRepository.save(sponsor);
    } catch (error) {
      throw new InternalServerErrorException('Error updating sponsor');
    }
  }
}
