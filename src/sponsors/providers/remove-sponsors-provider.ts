import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Sponsor } from '../sponsor.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class RemoveSponsorsProvider {
  constructor(
    @InjectRepository(Sponsor)
    private sponsorsRepository: Repository<Sponsor>,
  ) {}

  /**
   * deletes a sponsor from the database.
   * 
   * @returns {Promise<Sponsor>}
   * @throws {NotFoundException} If an error occurs while geting id of sponsor.
   * @throws {InternalServerErrorException} If an error occurs while deleting a sponsor.
   */
  async removeSponsor(id: number): Promise<void> {
    try {
      const sponsor = await this.sponsorsRepository.findOne({ where: { id } });
      if (!sponsor)
        throw new NotFoundException(`Sponsor with ID ${id} not found`);

      await this.sponsorsRepository.remove(sponsor);
    } catch (error) {
      throw new InternalServerErrorException('Error deleting sponsor');
    }
  }
}
