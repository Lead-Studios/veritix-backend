import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Conference } from '../entities/conference.entity';
import { CreateConferenceDto, UpdateConferenceDto } from '../dto';

@Injectable()
export class ConferenceService {
  constructor(
    @InjectRepository(Conference)
    private conferenceRepository: Repository<Conference>,
  ) {}

  async create(createConferenceDto: CreateConferenceDto): Promise<Conference> {
    const { location, bankDetails, socialMedia, ...conferenceData } = createConferenceDto;

    const conference = this.conferenceRepository.create({
      ...conferenceData,
      country: location.country,
      state: location.state,
      street: location.street,
      localGovernment: location.localGovernment,
      direction: location.direction,
      hideLocation: location.hideLocation || false,

      bankName: bankDetails.bankName,
      bankAccountNumber: bankDetails.bankAccountNumber,
      accountName: bankDetails.accountName,

      facebook: socialMedia?.facebook,
      twitter: socialMedia?.twitter,
      instagram: socialMedia?.instagram,

      comingSoon: conferenceData.comingSoon || false,
      transactionCharge: conferenceData.transactionCharge || false,
    });

    return this.conferenceRepository.save(conference);
  }

  async findAll(): Promise<Conference[]> {
    return this.conferenceRepository.find();
  }

  async findOne(id: string): Promise<Conference> {
    const conference = await this.conferenceRepository.findOne({ where: { id } });
    if (!conference) {
      throw new NotFoundException(`Conference with ID ${id} not found`);
    }
    return conference;
  }

  async update(id: string, updateConferenceDto: UpdateConferenceDto): Promise<Conference> {
    const conference = await this.findOne(id);
    const { location, bankDetails, socialMedia, ...conferenceData } = updateConferenceDto;

    Object.assign(conference, conferenceData);

    if (location) {
      if (location.country) conference.country = location.country;
      if (location.state) conference.state = location.state;
      if (location.street) conference.street = location.street;
      if (location.localGovernment) conference.localGovernment = location.localGovernment;
      if (location.direction !== undefined) conference.direction = location.direction;
      if (location.hideLocation !== undefined) conference.hideLocation = location.hideLocation;
    }

    if (bankDetails) {
      if (bankDetails.bankName) conference.bankName = bankDetails.bankName;
      if (bankDetails.bankAccountNumber) conference.bankAccountNumber = bankDetails.bankAccountNumber;
      if (bankDetails.accountName) conference.accountName = bankDetails.accountName;
    }

    if (socialMedia) {
      if (socialMedia.facebook !== undefined) conference.facebook = socialMedia.facebook;
      if (socialMedia.twitter !== undefined) conference.twitter = socialMedia.twitter;
      if (socialMedia.instagram !== undefined) conference.instagram = socialMedia.instagram;
    }

    return this.conferenceRepository.save(conference);
  }

  async remove(id: string): Promise<void> {
    const conference = await this.findOne(id);
    await this.conferenceRepository.remove(conference);
  }

  // === New fuzzy search method ===
  async search(
    query: string,
    category?: string,
    location?: string,
    limit = 10,
    offset = 0,
  ): Promise<{ results: Conference[]; total: number }> {
    if (!query || query.trim() === '') {
      throw new BadRequestException('Query parameter is required');
    }

    const qb: SelectQueryBuilder<Conference> = this.conferenceRepository.createQueryBuilder('conference');

    qb.where(
      `similarity(conference.conferenceName, :query) > 0.3
      OR similarity(conference.category, :query) > 0.3
      OR similarity(CONCAT_WS(' ', conference.country, conference.state, conference.street, conference.localGovernment), :query) > 0.3`,
      { query },
    );

    if (category) {
      qb.andWhere('conference.category ILIKE :category', { category: `%${category}%` });
    }

    if (location) {
      qb.andWhere(
        `CONCAT_WS(' ', conference.country, conference.state, conference.street, conference.localGovernment) ILIKE :location`,
        { location: `%${location}%` },
      );
    }

    qb.orderBy(`CASE WHEN conference.conferenceName ILIKE :exactQuery THEN 1 ELSE 2 END`, 'ASC')
      .addOrderBy(`similarity(conference.conferenceName, :query)`, 'DESC')
      .setParameters({ query, exactQuery: query });

    qb.skip(offset).take(limit);

    const [results, total] = await qb.getManyAndCount();

    return { results, total };
  }
}
