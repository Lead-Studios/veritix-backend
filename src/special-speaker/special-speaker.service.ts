import { CreateSpecialSpeakerDto } from "./dto/create-special-speaker.dto";
import { UpdateSpecialSpeakerDto } from "./dto/update-special-speaker.dto";
import { SpecialSpeaker } from "./entities/special-speaker.entity";
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class SpecialSpeakerService {
  constructor(
    @InjectRepository(SpecialSpeaker)
    private speakerRepo: Repository<SpecialSpeaker>,
  ) {}

  create(dto: CreateSpecialSpeakerDto) {
    const speaker = this.speakerRepo.create(dto);
    return this.speakerRepo.save(speaker);
  }

  findAll() {
    return this.speakerRepo.find();
  }

  findOne(id: number) {
    return this.speakerRepo.findOneBy({ id });
  }

  findByConference(conferenceId: number) {
    return this.speakerRepo.find({ where: { conferenceId } });
  }

  async update(id: number, dto: UpdateSpecialSpeakerDto) {
    await this.speakerRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    return this.speakerRepo.delete(id);
  }
}
