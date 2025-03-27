import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateContactUsDto } from './dto/create-contact-us.dto';
import { ContactUs } from './entities/contact-us.entity';

@Injectable()
export class ContactUsService {
  constructor(
    @InjectRepository(ContactUs)
    private contactUsRepository: Repository<ContactUs>,
  ) {}

  async create(createContactUsDto: CreateContactUsDto): Promise<ContactUs> {
    const contactUs = this.contactUsRepository.create(createContactUsDto);
    return this.contactUsRepository.save(contactUs);
  }

  async findAll(): Promise<ContactUs[]> {
    return this.contactUsRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string): Promise<ContactUs> {
    const contactUs = await this.contactUsRepository.findOne({ where: { id } });
    if (!contactUs) {
      throw new NotFoundException(`Contact message with ID ${id} not found`);
    }
    return contactUs;
  }

  async remove(id: string): Promise<void> {
    const result = await this.contactUsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Contact message with ID ${id} not found`);
    }
  }
}