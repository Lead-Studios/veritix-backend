import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Sponsor } from '../sponsor.entity';
import { Repository } from 'typeorm';

/**
 * Service provider for retrieving one sponsor.
 */
@Injectable()
export class FindOneSponsorProvider {
  constructor(
    @InjectRepository(Sponsor)
    private sponsorsRepository: Repository<Sponsor>,
  ) {}

  /**
   * Retrieves one sponsor from the database.
   * 
   * @returns {Promise<Sponsor>} A single sponsors.
   * @throws {InternalServerErrorException} If an error occurs while fetching sponsors.
   */
  async findOneSponsor(id: number): Promise<Sponsor> {
    try {
      const sponsor = await this.sponsorsRepository.findOne({ where: { id } });
      if (!sponsor)
        throw new NotFoundException(`Sponsor with ID ${id} not found`);
      return sponsor;
    } catch (error) {
      throw new InternalServerErrorException('Error retrieving sponsor');
    }
  }
}
