import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../security/guards/jwt-auth.guard";
import { RolesGuard } from "../../security/guards/rolesGuard/roles.guard";
import { UserRole } from "src/common/enums/users-roles.enum";
import { ConferenceGalleryService } from "./conference-gallery.service";
import {
  CreateConferenceGalleryDto,
  UpdateConferenceGalleryDto,
} from "./dto/conference-gallery.dto";
import { RoleDecorator } from "security/decorators/roles.decorator";
import { diskStorage } from "multer";
import * as path from "path";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { ConferenceGallery } from "./entities/conference-gallery.entity";

@Controller("gallery")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConferenceGalleryController {
  constructor(
    private readonly conferenceGalleryService: ConferenceGalleryService,
  ) {}

  @Post()
  @RoleDecorator(UserRole.Organizer, UserRole.Admin)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = path.join(
            process.cwd(),
            "uploads",
            "event-gallery",
          );

          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }

          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = `${uuidv4()}${path.extname(file.originalname)}`;
          cb(null, uniqueSuffix);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(
          path.extname(file.originalname).toLowerCase(),
        );
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
          return cb(null, true);
        }

        cb(new Error("Only image files are allowed!"), false);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createConferenceGalleryDto: CreateConferenceGalleryDto,
  ) {
    if (!file) {
      throw new BadRequestException("Image file is required");
    }

    const imageUrl = path.join("uploads", "conference-gallery", file.filename);

    const galleryImage = await this.conferenceGalleryService.create({
      ...createConferenceGalleryDto,
      imageUrl: imageUrl,
    });

    return this.mapToResponseDto(galleryImage);
  }

  @Get()
  async findAll() {
    const galleryImages = await this.conferenceGalleryService.findAll();
    return galleryImages.map(this.mapToResponseDto);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const galleryImage = await this.conferenceGalleryService.findOne(id);
    return this.mapToResponseDto(galleryImage);
  }

  @Get("conferences/:conferenceId")
  async findByConferenceId(@Param("conferenceId") conferenceId: string) {
    const galleryImages =
      await this.conferenceGalleryService.findByConferenceId(conferenceId);
    return galleryImages.map(this.mapToResponseDto);
  }

  @Put(":id")
  @RoleDecorator(UserRole.Organizer, UserRole.Admin)
  async update(
    @Param("id") id: string,
    @Body() updateConferenceGalleryDto: UpdateConferenceGalleryDto,
  ) {
    const galleryImage = await this.conferenceGalleryService.update(
      id,
      updateConferenceGalleryDto,
    );
    return this.mapToResponseDto(galleryImage);
  }

  @Delete(":id")
  @RoleDecorator(UserRole.Organizer, UserRole.Admin)
  async remove(@Param("id") id: string): Promise<void> {
    await this.conferenceGalleryService.remove(id);
  }

  private mapToResponseDto(galleryImage: ConferenceGallery) {
    return {
      id: galleryImage.id,
      imageUrl: galleryImage.imageUrl,
      description: galleryImage.description,
      conferenceId: galleryImage.conference.id,
      createdAt: galleryImage.createdAt,
      updatedAt: galleryImage.updatedAt,
    };
  }
}
