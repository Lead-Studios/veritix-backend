import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Sponsor } from '../sponsor.entity';
import { Repository } from 'typeorm';
import { CreateSponsorDto } from '../dtos/create-sponsor.dto';

/**
 * Service provider for updating sponsors.
 */
@Injectable()
export class CreateSponsorsProvider {
  constructor(
    @InjectRepository(Sponsor)
    private sponsorsRepository: Repository<Sponsor>,
  ) {}

  /**
   * Updates a sponsor by ID.
   * 
   * @param {number} id - The ID of the sponsor to update.
   * @param {UpdateSponsorDto} updateSponsorDto - DTO containing updated sponsor details.
   * @returns {Promise<Sponsor>} The updated sponsor entity.
   * @throws {NotFoundException} If the sponsor with the given ID is not found.
   * @throws {InternalServerErrorException} If an error occurs while updating the sponsor.
   */
  public async createSponsor(
    createSponsorDto: CreateSponsorDto,
  ): Promise<Sponsor> {
    try {
      const sponsor = this.sponsorsRepository.create(createSponsorDto);
      return await this.sponsorsRepository.save(sponsor);
    } catch (error) {
      throw new InternalServerErrorException('Error creating sponsor');
    }
  }
}
