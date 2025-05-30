import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConferenceGallery } from "./entities/conference-gallery.entity";
import {
  CreateConferenceGalleryDto,
  UpdateConferenceGalleryDto,
} from "./dto/conference-gallery.dto";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class ConferenceGalleryService {
  private readonly MAX_IMAGES_PER_CONFERENCE = 10;

  constructor(
    @InjectRepository(ConferenceGallery)
    private conferenceGalleryRepository: Repository<ConferenceGallery>,
  ) {}

  async create(
    createConferenceGalleryDto: CreateConferenceGalleryDto,
    imageUrl: string,
  ): Promise<ConferenceGallery> {
    const count = await this.conferenceGalleryRepository.count({
      where: { conference: { id: createConferenceGalleryDto.conferenceId } },
    });

    if (count >= this.MAX_IMAGES_PER_CONFERENCE) {
      throw new BadRequestException(
        `Maximum of ${this.MAX_IMAGES_PER_CONFERENCE} images per conference reached`,
      );
    }

    const galleryImage = this.conferenceGalleryRepository.create({
      ...createConferenceGalleryDto,
      imageUrl: imageUrl,
      conference: { id: createConferenceGalleryDto.conferenceId },
    });

    return this.conferenceGalleryRepository.save(galleryImage);
  }

  async findAll(): Promise<ConferenceGallery[]> {
    return this.conferenceGalleryRepository.find({
      relations: ["conference"],
    });
  }

  async findOne(id: string): Promise<ConferenceGallery> {
    const galleryImage = await this.conferenceGalleryRepository.findOne({
      where: { id },
      relations: ["conference"],
    });

    if (!galleryImage) {
      throw new NotFoundException(`Gallery image with ID ${id} not found`);
    }

    return galleryImage;
  }

  async findByConferenceId(conferenceId: string): Promise<ConferenceGallery[]> {
    return this.conferenceGalleryRepository.find({
      where: { conference: { id: conferenceId } },
      relations: ["conference"],
      order: { createdAt: "DESC" },
    });
  }

  async update(
    id: string,
    updateConferenceGalleryDto: UpdateConferenceGalleryDto,
    file?: Express.Multer.File,
  ): Promise<ConferenceGallery> {
    const galleryImage = await this.findOne(id);

    if (updateConferenceGalleryDto.description !== undefined) {
      galleryImage.description = updateConferenceGalleryDto.description;
    }

    if (file) {
      // Delete the old image file if it exists
      if (galleryImage.imageUrl) {
        const oldImagePath = path.join(process.cwd(), galleryImage.imageUrl);
        this.removeFile(oldImagePath); // Use helper function to remove file
      }
      // Set the new image URL (relative path)
      galleryImage.imageUrl = path
        .join("uploads", "conference-gallery", file.filename)
        .replace(/\\/g, "/");
    }

    return this.conferenceGalleryRepository.save(galleryImage);
  }

  async remove(id: string): Promise<void> {
    const galleryImage = await this.findOne(id);

    await this.conferenceGalleryRepository.delete(id);
  }

  private removeFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Error removing file ${filePath}:`, error);
    }
  }
}
