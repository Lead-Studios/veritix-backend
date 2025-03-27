import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import {
  CreateEventGalleryDto,
  UpdateEventGalleryDto,
} from "./dto/event-gallery.dto";
import { JwtAuthGuard } from "../../security/guards/jwt-auth.guard";
import { RolesGuard } from "../../security/guards/rolesGuard/roles.guard";
import { EventGalleryService } from "./event-gallery.service";
import { UserRole } from "src/common/enums/users-roles.enum";
import { RoleDecorator } from "security/decorators/roles.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import * as path from "path";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";

@Controller("gallery")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventGalleryController {
  constructor(private readonly galleryService: EventGalleryService) {}

  @RoleDecorator(UserRole.Admin)
  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = path.join(
            process.cwd(),
            "uploads",
            "event-gallery",
          );

          // Create directory if it doesn't exist
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }

          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          // Generate unique filename
          const uniqueSuffix = `${uuidv4()}${path.extname(file.originalname)}`;
          cb(null, uniqueSuffix);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Validate file type
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
        fileSize: 5 * 1024 * 1024, // 5MB file size limit
      },
    }),
  )
  async createGalleryImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() createGalleryDto: CreateEventGalleryDto,
  ) {
    // Construct the image URL relative to the project root
    const imageUrl = path.join("uploads", "event-gallery", file.filename);

    // Creating DTO with the image URL
    const galleryDto = {
      ...createGalleryDto,
      imageUrl: imageUrl,
    };

    return this.galleryService.createGalleryImage(galleryDto)
    // return this.galleryService.createGalleryImage(createGalleryDto);
  }

  @RoleDecorator(UserRole.Admin, UserRole.User)
  @Get()
  async getAllImages(
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
  ) {
    return this.galleryService.getAllImages(Number(page), Number(limit));
  }

  @RoleDecorator(UserRole.Admin, UserRole.Guest, UserRole.User)
  @Get(":id")
  async getImageById(@Param("id") id: string) {
    return this.galleryService.getImageById(id);
  }

  @RoleDecorator(UserRole.Admin, UserRole.Guest, UserRole.User)
  @Get("events/:eventId")
  async getEventGallery(
    @Param("eventId") eventId: string,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
  ) {
    return this.galleryService.getEventGallery(
      eventId,
      Number(page),
      Number(limit),
    );
  }

  @RoleDecorator(UserRole.Admin)
  @Put(":id")
  async updateImageDescription(
    @Param("id") id: string,
    @Body() updateGalleryDto: UpdateEventGalleryDto,
  ) {
    return this.galleryService.updateImageDescription(id, updateGalleryDto);
  }

  @RoleDecorator(UserRole.Admin)
  @Delete(":id")
  async deleteImage(@Param("id") id: string) {
    return this.galleryService.deleteImage(id);
  }
}
