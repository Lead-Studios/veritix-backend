import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import type { Repository } from "typeorm"
import { Poster } from "./entities/poster.entity"
import type { CreatePosterDto } from "./dto/create-poster.dto"
import type { UpdatePosterDto } from "./dto/update-poster.dto"
import * as fs from "fs"
import type { Express } from "express"

@Injectable()
export class PostersService {
  private readonly logger = new Logger(PostersService.name);

  constructor(
    @InjectRepository(Poster)
    private postersRepository: Repository<Poster>,
  ) {}

  async create(file: Express.Multer.File, createPosterDto: CreatePosterDto): Promise<Poster> {
    if (!file) {
      throw new BadRequestException("Poster image is required")
    }

    try {
      const poster = new Poster()
      poster.imageUrl = file.path
      poster.description = createPosterDto.description
      poster.eventId = createPosterDto.eventId

      this.logger.log(`Creating new poster for event: ${createPosterDto.eventId}`)
      return await this.postersRepository.save(poster)
    } catch (error) {
      this.logger.error(`Failed to create poster: ${error.message}`, error.stack)
      throw new BadRequestException("Failed to create poster")
    }
  }

  async findAll(): Promise<Poster[]> {
    this.logger.log("Retrieving all posters")
    return this.postersRepository.find()
  }

  async findOne(id: string): Promise<Poster> {
    this.logger.log(`Retrieving poster with id: ${id}`)
    const poster = await this.postersRepository.findOne({ where: { id } })

    if (!poster) {
      this.logger.warn(`Poster with id ${id} not found`)
      throw new NotFoundException(`Poster with ID ${id} not found`)
    }

    return poster
  }

  async findByEvent(eventId: string): Promise<Poster[]> {
    this.logger.log(`Retrieving posters for event: ${eventId}`)
    return this.postersRepository.find({ where: { eventId } })
  }

  async update(id: string, file: Express.Multer.File, updatePosterDto: UpdatePosterDto): Promise<Poster> {
    const poster = await this.findOne(id)

    try {
      if (file) {
        // Delete old image if it exists
        if (poster.imageUrl && fs.existsSync(poster.imageUrl)) {
          fs.unlinkSync(poster.imageUrl)
        }
        poster.imageUrl = file.path
      }

      if (updatePosterDto.description) {
        poster.description = updatePosterDto.description
      }

      if (updatePosterDto.eventId) {
        poster.eventId = updatePosterDto.eventId
      }

      this.logger.log(`Updating poster with id: ${id}`)
      return await this.postersRepository.save(poster)
    } catch (error) {
      this.logger.error(`Failed to update poster: ${error.message}`, error.stack)
      throw new BadRequestException("Failed to update poster")
    }
  }

  async remove(id: string): Promise<void> {
    const poster = await this.findOne(id)

    try {
      // Delete image file
      if (poster.imageUrl && fs.existsSync(poster.imageUrl)) {
        fs.unlinkSync(poster.imageUrl)
      }

      this.logger.log(`Deleting poster with id: ${id}`)
      await this.postersRepository.remove(poster)
    } catch (error) {
      this.logger.error(`Failed to delete poster: ${error.message}`, error.stack)
      throw new BadRequestException("Failed to delete poster")
    }
  }
}

