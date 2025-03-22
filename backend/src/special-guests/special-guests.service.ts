import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpecialGuest } from './entities/special-guest.entity';
import { CreateSpecialGuestDto } from './dto/create-special-guest.dto';

@Injectable()
export class SpecialGuestService {
  constructor(
    @InjectRepository(SpecialGuest)
    private readonly specialGuestRepository: Repository<SpecialGuest>,
  ) {}

  async createSpecialGuest(dto: CreateSpecialGuestDto): Promise<SpecialGuest> {
    const specialGuest = this.specialGuestRepository.create(dto);
    return this.specialGuestRepository.save(specialGuest);
  }

  async getAllSpecialGuests(): Promise<SpecialGuest[]> {
    return this.specialGuestRepository.find();
  }

  async getSpecialGuestById(id: string): Promise<SpecialGuest> {
    const guest = await this.specialGuestRepository.findOne({ where: { id } });
    if (!guest) throw new NotFoundException('Special Guest not found');
    return guest;
  }

  // async getSpecialGuestsByEvent(eventId: string): Promise<SpecialGuest[]> {
  //   return this.specialGuestRepository.find({
  //     where: { event: { id: eventId } },
  //   });
  // }

  async updateSpecialGuest(
    id: string,
    dto: Partial<CreateSpecialGuestDto>,
  ): Promise<SpecialGuest> {
    const guest = await this.getSpecialGuestById(id);
    Object.assign(guest, dto);
    return this.specialGuestRepository.save(guest);
  }

  async deleteSpecialGuest(id: string): Promise<void> {
    const result = await this.specialGuestRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException('Special Guest not found');
  }
}
