import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Sponsor } from '../sponsor.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * Service provider for retrieving all sponsors.
 */
@Injectable()
export class FindAllSponsorsProvider {
  constructor(
    @InjectRepository(Sponsor)
    private sponsorsRepository: Repository<Sponsor>,
  ) {}

  /**
   * Retrieves all sponsors from the database.
   * 
   * @returns {Promise<Sponsor[]>} A list of all sponsors.
   * @throws {InternalServerErrorException} If an error occurs while fetching sponsors.
   */
  async findAllSponsors(): Promise<Sponsor[]> {
    try {
      return await this.sponsorsRepository.find();
    } catch (error) {
      throw new InternalServerErrorException('Error fetching sponsors');
    }
  }
}
