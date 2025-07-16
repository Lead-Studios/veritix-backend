import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sponsor } from '../entities/sponsor.entity';
import { CreateSponsorDto } from '../dtos/create-sponsor.dto';
import { UpdateSponsorDto } from '../dtos/update-sponsor.dto';
import { Event } from '../../events/entities/event.entity';
import * as AWS from 'aws-sdk';
import { File as MulterFile } from 'multer';

@Injectable()
export class SponsorService {
  private s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  private bucket = process.env.AWS_S3_BUCKET || '';

  constructor(
    @InjectRepository(Sponsor)
    private readonly sponsorRepo: Repository<Sponsor>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async uploadImageToS3(file: MulterFile): Promise<string> {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!this.bucket) throw new Error('AWS_S3_BUCKET is not set');
    const key = `sponsors/${Date.now()}-${file.originalname}`;
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

  async deleteImageFromS3(imageUrl: string) {
    if (imageUrl && imageUrl.includes(this.bucket)) {
      const key = imageUrl.split(`.amazonaws.com/`)[1];
      if (key) {
        await this.s3.deleteObject({ Bucket: this.bucket as string, Key: key }).promise();
      }
    }
  }

  async create(dto: CreateSponsorDto) {
    const event = await this.eventRepo.findOne({ where: { id: dto.eventId }, relations: ['sponsors'] });
    if (!event) throw new NotFoundException('Event not found');
    const sponsor = this.sponsorRepo.create({
      brandImage: dto.brandImage,
      brandName: dto.brandName,
      brandWebsite: dto.brandWebsite,
      facebook: dto.facebook,
      twitter: dto.twitter,
      instagram: dto.instagram,
      event,
    });
    return this.sponsorRepo.save(sponsor);
  }

  async findAll() {
    return this.sponsorRepo.find({ relations: ['event'] });
  }

  async findOne(id: string) {
    const sponsor = await this.sponsorRepo.findOne({ where: { id }, relations: ['event'] });
    if (!sponsor) throw new NotFoundException('Sponsor not found');
    return sponsor;
  }

  async findByEvent(eventId: string) {
    const event = await this.eventRepo.findOne({ where: { id: eventId }, relations: ['sponsors'] });
    if (!event) throw new NotFoundException('Event not found');
    return event.sponsors;
  }

  async update(id: string, dto: UpdateSponsorDto) {
    const sponsor = await this.sponsorRepo.findOne({ where: { id } });
    if (!sponsor) throw new NotFoundException('Sponsor not found');
    if (dto.brandImage && dto.brandImage !== sponsor.brandImage) {
      await this.deleteImageFromS3(sponsor.brandImage);
      sponsor.brandImage = dto.brandImage;
    }
    if (dto.brandName) sponsor.brandName = dto.brandName;
    if (dto.brandWebsite) sponsor.brandWebsite = dto.brandWebsite;
    if (dto.facebook !== undefined) sponsor.facebook = dto.facebook;
    if (dto.twitter !== undefined) sponsor.twitter = dto.twitter;
    if (dto.instagram !== undefined) sponsor.instagram = dto.instagram;
    if (dto.eventId) {
      const event = await this.eventRepo.findOne({ where: { id: dto.eventId } });
      if (!event) throw new NotFoundException('Event not found');
      sponsor.event = event;
    }
    return this.sponsorRepo.save(sponsor);
  }

  async remove(id: string) {
    const sponsor = await this.sponsorRepo.findOne({ where: { id } });
    if (!sponsor) throw new NotFoundException('Sponsor not found');
    await this.deleteImageFromS3(sponsor.brandImage);
    await this.sponsorRepo.remove(sponsor);
    return { deleted: true };
  }
} 