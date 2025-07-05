import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collaborator } from '../entities/collaborator.entity';
import { CreateCollaboratorDto } from '../dtos/create-collaborator.dto';
import { UpdateCollaboratorDto } from '../dtos/update-collaborator.dto';
import { Event } from '../entities/event.entity';
import * as AWS from 'aws-sdk';
import { File as MulterFile } from 'multer';

@Injectable()
export class CollaboratorService {
  private s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });
  private bucket = process.env.AWS_S3_BUCKET || '';

  constructor(
    @InjectRepository(Collaborator)
    private readonly collaboratorRepo: Repository<Collaborator>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async uploadImageToS3(file: MulterFile): Promise<string> {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!this.bucket) throw new Error('AWS_S3_BUCKET is not set');
    const key = `collaborators/${Date.now()}-${file.originalname}`;
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

  async create(dto: CreateCollaboratorDto) {
    const event = await this.eventRepo.findOne({ 
      where: { id: dto.eventId }, 
      relations: ['collaborators'] 
    });
    if (!event) throw new NotFoundException('Event not found');
    
    // Enforce maximum 5 collaborators per event
    if (event.collaborators.length >= 5) {
      throw new BadRequestException('Maximum 5 collaborators allowed per event');
    }

    const collaborator = this.collaboratorRepo.create({
      name: dto.name,
      image: dto.image,
      email: dto.email,
      event,
    });
    return this.collaboratorRepo.save(collaborator);
  }

  async findAll() {
    return this.collaboratorRepo.find({ relations: ['event'] });
  }

  async findOne(id: string) {
    const collaborator = await this.collaboratorRepo.findOne({ 
      where: { id }, 
      relations: ['event'] 
    });
    if (!collaborator) throw new NotFoundException('Collaborator not found');
    return collaborator;
  }

  async findByEvent(eventId: string) {
    const event = await this.eventRepo.findOne({ 
      where: { id: eventId }, 
      relations: ['collaborators'] 
    });
    if (!event) throw new NotFoundException('Event not found');
    return event.collaborators;
  }

  async update(id: string, dto: UpdateCollaboratorDto) {
    const collaborator = await this.collaboratorRepo.findOne({ where: { id } });
    if (!collaborator) throw new NotFoundException('Collaborator not found');
    
    // Handle image update and S3 cleanup
    if (dto.image && dto.image !== collaborator.image) {
      await this.deleteImageFromS3(collaborator.image);
      collaborator.image = dto.image;
    }
    
    if (dto.name) collaborator.name = dto.name;
    if (dto.email) collaborator.email = dto.email;
    
    // Handle event change with collaborator limit validation
    if (dto.eventId && dto.eventId !== collaborator.event?.id) {
      const newEvent = await this.eventRepo.findOne({ 
        where: { id: dto.eventId }, 
        relations: ['collaborators'] 
      });
      if (!newEvent) throw new NotFoundException('Event not found');
      
      // Check if the new event already has 5 collaborators
      if (newEvent.collaborators.length >= 5) {
        throw new BadRequestException('Maximum 5 collaborators allowed per event');
      }
      
      collaborator.event = newEvent;
    }
    
    return this.collaboratorRepo.save(collaborator);
  }

  async remove(id: string) {
    const collaborator = await this.collaboratorRepo.findOne({ where: { id } });
    if (!collaborator) throw new NotFoundException('Collaborator not found');
    
    await this.deleteImageFromS3(collaborator.image);
    await this.collaboratorRepo.remove(collaborator);
    return { deleted: true };
  }
} 