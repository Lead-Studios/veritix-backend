import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ConferencePoster } from './entities/conference-poster.entity';
import { CreateConferencePosterDto } from './dto/create-conference-poster.dto';
import { UpdateConferencePosterDto } from './dto/update-conference-poster.dto';

@Injectable()
export class ConferencePosterManagementService {
  constructor(
    @InjectRepository(ConferencePoster)
    private conferencePosterRepository: Repository<ConferencePoster>,
  ) {}

  async create(file: Express.Multer.File, createConferencePosterDto: CreateConferencePosterDto): Promise<ConferencePoster> {
    if (!file) {
      throw new BadRequestException('Poster image is required');
    }
    const uploadsDir = path.join(process.cwd(), 'uploads', 'conference-posters');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const uniqueFilename = `${uuidv4()}_${file.originalname}`;
    const filePath = path.join(uploadsDir, uniqueFilename);
    
    fs.writeFileSync(filePath, file.buffer);
    
    const relativePath = path.join('uploads', 'conference-posters', uniqueFilename);

    const newPoster = this.conferencePosterRepository.create({
      ...createConferencePosterDto,
      imageUrl: relativePath.replace(/\\/g, '/'),
    });

    return this.conferencePosterRepository.save(newPoster);
  }

  async findAll(): Promise<ConferencePoster[]> {
    return this.conferencePosterRepository.find({
      relations: ['conference'],
    });
  }

  async findOne(id: string): Promise<ConferencePoster> {
    const poster = await this.conferencePosterRepository.findOne({
      where: { id },
      relations: ['conference'],
    });

    if (!poster) {
      throw new NotFoundException(`Poster with ID '${id}' not found`);
    }

    return poster;
  }

  async findByConference(conferenceId: string): Promise<ConferencePoster[]> {
    return this.conferencePosterRepository.find({
      where: { conferenceId },
      relations: ['conference'],
    });
  }

  async update(id: string, file: Express.Multer.File, updateConferencePosterDto: UpdateConferencePosterDto): Promise<ConferencePoster> {
    const poster = await this.findOne(id);
    
    if (file) {
      if (poster.imageUrl) {
        const oldFilePath = path.join(process.cwd(), poster.imageUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      const uploadsDir = path.join(process.cwd(), 'uploads', 'conference-posters');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const uniqueFilename = `${uuidv4()}_${file.originalname}`;
      const filePath = path.join(uploadsDir, uniqueFilename);
      
      fs.writeFileSync(filePath, file.buffer);
      
      const relativePath = path.join('uploads', 'conference-posters', uniqueFilename);
      poster.imageUrl = relativePath.replace(/\\/g, '/');
    }

    if (updateConferencePosterDto.description) {
      poster.description = updateConferencePosterDto.description;
    }
    
    if (updateConferencePosterDto.conferenceId) {
      poster.conferenceId = updateConferencePosterDto.conferenceId;
    }

    return this.conferencePosterRepository.save(poster);
  }

  async remove(id: string): Promise<void> {
    const poster = await this.findOne(id);
    
    if (poster.imageUrl) {
      const filePath = path.join(process.cwd(), poster.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await this.conferencePosterRepository.remove(poster);
  }
}
