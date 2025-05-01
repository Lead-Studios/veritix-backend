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

@Injectable()
export class ConferenceGalleryService {
  private readonly MAX_IMAGES_PER_CONFERENCE = 10;

  constructor(
    @InjectRepository(ConferenceGallery)
    private conferenceGalleryRepository: Repository<ConferenceGallery>,
  ) {}

  async create(
    createConferenceGalleryDto: CreateConferenceGalleryDto,
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
      conference: { id: createConferenceGalleryDto.conferenceId },
    });

    return this.conferenceGalleryRepository.save(galleryImage);
  }

  async findAll(): Promise<ConferenceGallery[]> {
    return this.conferenceGalleryRepository.find({
      relations: ["conference", "organizer"],
    });
  }

  async findOne(id: string): Promise<ConferenceGallery> {
    const galleryImage = await this.conferenceGalleryRepository.findOne({
      where: { id },
      relations: ["conference", "organizer"],
    });

    if (!galleryImage) {
      throw new NotFoundException(`Gallery image with ID ${id} not found`);
    }

    return galleryImage;
  }

  async findByConferenceId(conferenceId: string): Promise<ConferenceGallery[]> {
    return this.conferenceGalleryRepository.find({
      where: { conference: { id: conferenceId } },
      relations: ["organizer"],
      order: { createdAt: "DESC" },
    });
  }

  async update(
    id: string,
    updateConferenceGalleryDto: UpdateConferenceGalleryDto,
  ): Promise<ConferenceGallery> {
    const galleryImage = await this.findOne(id);

    if (updateConferenceGalleryDto.description !== undefined) {
      galleryImage.description = updateConferenceGalleryDto.description;
    }

    return this.conferenceGalleryRepository.save(galleryImage);
  }

  async remove(id: string): Promise<void> {
    const galleryImage = await this.findOne(id);

    await this.conferenceGalleryRepository.delete(id);
  }
}
