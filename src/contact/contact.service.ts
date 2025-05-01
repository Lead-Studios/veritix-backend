import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactMessage } from './entities/contact-message-entity';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactMessage)
    private contactRepository: Repository<ContactMessage>,
  ) {}

  /**
   * Create a new contact message
   */
  async create(createContactDto: CreateContactDto): Promise<ContactMessage> {
    // Check for spam keywords
    if (this.containsSpamKeywords(createContactDto.message)) {
      throw new BadRequestException('Message contains prohibited content');
    }

    const contactMessage = this.contactRepository.create(createContactDto);
    return await this.contactRepository.save(contactMessage);
  }

  /**
   * Get all contact messages
   */
  async findAll(): Promise<ContactMessage[]> {
    return await this.contactRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single contact message by ID
   */
  async findOne(id: string): Promise<ContactMessage> {
    const message = await this.contactRepository.findOne({ where: { id } });
    if (!message) {
      throw new NotFoundException(`Contact message with ID "${id}" not found`);
    }
    return message;
  }

  /**
   * Delete a contact message by ID
   */
  async remove(id: string): Promise<void> {
    const result = await this.contactRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Contact message with ID "${id}" not found`);
    }
  }

  /**
   * Simple spam detection by checking for common spam keywords
   */
  private containsSpamKeywords(message: string): boolean {
    const spamKeywords = [
      'viagra', 'cialis', 'crypto', 'bitcoin', 'make money fast', 
      'instant wealth', 'casino', 'lottery', 'prize', 'winner', 
      'free gift', 'million dollars'
    ];
    
    const lowercaseMessage = message.toLowerCase();
    return spamKeywords.some(keyword => lowercaseMessage.includes(keyword.toLowerCase()));
  }
}