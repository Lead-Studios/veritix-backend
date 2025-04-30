import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
      // Flatten location properties
      country: location.country,
      state: location.state,
      street: location.street,
      localGovernment: location.localGovernment,
      direction: location.direction,
      hideLocation: location.hideLocation || false,
      
      // Flatten bank details
      bankName: bankDetails.bankName,
      bankAccountNumber: bankDetails.bankAccountNumber,
      accountName: bankDetails.accountName,
      
      // Flatten social media
      facebook: socialMedia?.facebook,
      twitter: socialMedia?.twitter,
      instagram: socialMedia?.instagram,
      
      // Default values
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
    
    // Update base conference data
    Object.assign(conference, conferenceData);
    
    // Update location properties if provided
    if (location) {
      if (location.country) conference.country = location.country;
      if (location.state) conference.state = location.state;
      if (location.street) conference.street = location.street;
      if (location.localGovernment) conference.localGovernment = location.localGovernment;
      if (location.direction !== undefined) conference.direction = location.direction;
      if (location.hideLocation !== undefined) conference.hideLocation = location.hideLocation;
    }
    
    // Update bank details if provided
    if (bankDetails) {
      if (bankDetails.bankName) conference.bankName = bankDetails.bankName;
      if (bankDetails.bankAccountNumber) conference.bankAccountNumber = bankDetails.bankAccountNumber;
      if (bankDetails.accountName) conference.accountName = bankDetails.accountName;
    }
    
    // Update social media if provided
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
}
