import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpecialGuest } from '../entities/special-guest.entity';
import { CreateSpecialGuestDto } from '../dtos/create-special-guest.dto';
import { UpdateSpecialGuestDto } from '../dtos/update-special-guest.dto';
import { SpecialGuestResource } from '../resources/special-guest.resource';
import { Event } from '../../event/entities/event.entity';
import * as AWS from 'aws-sdk';
import { Express } from 'express';
import { File as MulterFile } from 'multer';

@Injectable()
export class SpecialGuestService {
  private s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  private bucket = process.env.AWS_S3_BUCKET || '';

  constructor(
    @InjectRepository(SpecialGuest)
    private readonly specialGuestRepo: Repository<SpecialGuest>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async create(dto: CreateSpecialGuestDto) {
    const event = await this.eventRepo.findOne({ where: { id: dto.eventId } });
    if (!event) throw new BadRequestException('Event not found');
    const guest = this.specialGuestRepo.create({ ...dto, event });
    return SpecialGuestResource.toResponse(await this.specialGuestRepo.save(guest));
  }

  async findAll() {
    const guests = await this.specialGuestRepo.find();
    return SpecialGuestResource.toArray(guests);
  }

  async findOne(id: string) {
    const guest = await this.specialGuestRepo.findOne({ where: { id } });
    if (!guest) throw new NotFoundException('Special guest not found');
    return SpecialGuestResource.toResponse(guest);
  }

  async findByEvent(eventId: string) {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new BadRequestException('Event not found');
    const guests = await this.specialGuestRepo.find({ where: { event } });
    return SpecialGuestResource.toArray(guests);
  }

  async update(id: string, dto: UpdateSpecialGuestDto) {
    const guest = await this.specialGuestRepo.findOne({ where: { id } });
    if (!guest) throw new NotFoundException('Special guest not found');
    if (dto.eventId) {
      const event = await this.eventRepo.findOne({ where: { id: dto.eventId } });
      if (!event) throw new BadRequestException('Event not found');
      guest.event = event;
    }
    Object.assign(guest, dto);
    return SpecialGuestResource.toResponse(await this.specialGuestRepo.save(guest));
  }

  async remove(id: string) {
    const guest = await this.specialGuestRepo.findOne({ where: { id } });
    if (!guest) throw new NotFoundException('Special guest not found');
    // Delete image from S3 if present
    if (guest.image && guest.image.includes(this.bucket)) {
      const key = guest.image.split(`.amazonaws.com/`)[1];
      if (key) {
        await this.s3.deleteObject({ Bucket: this.bucket as string, Key: key }).promise();
      }
    }
    await this.specialGuestRepo.delete(id);
    return { deleted: true };
  }

  async uploadImageToS3(file: MulterFile): Promise<string> {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!this.bucket) throw new Error('AWS_S3_BUCKET is not set');
    const key = `special-guests/${Date.now()}-${file.originalname}`;
    await this.s3
      .putObject({
        Bucket: this.bucket as string,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      })
      .promise();
    return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }
} 