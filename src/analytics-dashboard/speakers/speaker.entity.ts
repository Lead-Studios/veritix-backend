import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Speaker } from './entities/speaker.entity';

@Injectable()
export class SpeakersService {
  constructor(
    @InjectRepository(Speaker)
    private speakerRepository: Repository<Speaker>,
  ) {}

  async findAll(): Promise<Speaker[]> {
    return this.speakerRepository.find();
  }

  async findOne(id: string): Promise<Speaker> {
    return this.speakerRepository.findOne({ where: { id } });
  }
}