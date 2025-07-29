import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Poster } from '../entities/poster.entity';
import { CreatePosterDto } from '../dtos/create-poster.dto';
import { UpdatePosterDto } from '../dtos/update-poster.dto';
import { PosterResource } from '../resources/poster.resource';
import { Event } from '../../events/entities/event.entity';
import * as AWS from 'aws-sdk';
import { File as MulterFile } from 'multer';

@Injectable()
export class PosterService {
  private s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  private bucket = process.env.AWS_S3_BUCKET || '';

  constructor(
    @InjectRepository(Poster)
    private readonly posterRepo: Repository<Poster>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async uploadImageToS3(file: MulterFile): Promise<string> {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!this.bucket) throw new Error('AWS_S3_BUCKET is not set');
    const key = `posters/${Date.now()}-${file.originalname}`;
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
        await this.s3
          .deleteObject({ Bucket: this.bucket as string, Key: key })
          .promise();
      }
    }
  }

  async create(dto: CreatePosterDto) {
    const event = await this.eventRepo.findOne({ where: { id: dto.eventId } });
    if (!event) throw new BadRequestException('Event not found');
    const poster = this.posterRepo.create({ ...dto, event });
    return PosterResource.toResponse(await this.posterRepo.save(poster));
  }

  async findAll() {
    const posters = await this.posterRepo.find();
    return PosterResource.toArray(posters);
  }

  async findOne(id: string) {
    const poster = await this.posterRepo.findOne({ where: { id } });
    if (!poster) throw new NotFoundException('Poster not found');
    return PosterResource.toResponse(poster);
  }

  async findByEvent(eventId: string) {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new BadRequestException('Event not found');
    const posters = await this.posterRepo.find({ where: { event } });
    return PosterResource.toArray(posters);
  }

  async update(id: string, dto: UpdatePosterDto) {
    const poster = await this.posterRepo.findOne({ where: { id } });
    if (!poster) throw new NotFoundException('Poster not found');
    if (dto.eventId) {
      const event = await this.eventRepo.findOne({
        where: { id: dto.eventId },
      });
      if (!event) throw new BadRequestException('Event not found');
      poster.event = event;
    }
    Object.assign(poster, dto);
    return PosterResource.toResponse(await this.posterRepo.save(poster));
  }

  async remove(id: string) {
    const poster = await this.posterRepo.findOne({ where: { id } });
    if (!poster) throw new NotFoundException('Poster not found');
    await this.deleteImageFromS3(poster.image);
    await this.posterRepo.delete(id);
    return { deleted: true };
  }
}
