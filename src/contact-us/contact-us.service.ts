import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateContactUsDto } from './dto/create-contact-us.dto';
import { UpdateContactUsDto } from "./dto/update-contact-us.dto";
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
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<ContactUs> {
    const contactUs = await this.contactUsRepository.findOne({ where: { id } });
    if (!contactUs) {
      throw new NotFoundException(`Contact message with ID ${id} not found`);
    }
    return contactUs;
  }

  async remove(id: string): Promise<ContactUs> {
    const contactUs = await this.findOne(id);
    const result = await this.contactUsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Contact message with ID ${id} not found`);
    }
    return contactUs;
  }

  /**
   * Updates a contact message by ID and returns the updated entity.
   * @param id - The ID of the contact message to update.
   * @param updateContactUsDto - The DTO containing updated fields.
   * @returns The updated ContactUs entity.
   */
  async update(
    id: string,
    updateContactUsDto: UpdateContactUsDto,
  ): Promise<ContactUs> {
    const contactUs = await this.findOne(id);

    // Merge updated fields into the entity
    const updatedContactUs = this.contactUsRepository.merge(
      contactUs,
      updateContactUsDto,
    );

    // Save the updated entity
    return this.contactUsRepository.save(updatedContactUs);
  }
}
