// import {
//   Controller,
//   Get,
//   Post,
//   Body,
//   Patch,
//   Param,
//   Delete,
//   UseGuards,
//   Query,
//   UseInterceptors,
//   UploadedFile,
//   UploadedFiles,
// } from "@nestjs/common";
// import {
//   ApiTags,
//   ApiOperation,
//   ApiResponse,
//   ApiBearerAuth,
//   ApiParam,
//   ApiQuery,
//   ApiConsumes,
//   ApiBody,
// } from "@nestjs/swagger";
// import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
// import { EventGalleryService } from "./event-gallery.service";
// import { CreateGalleryItemDto } from "./dto/create-gallery-item.dto";
// import { UpdateGalleryItemDto } from "./dto/update-gallery-item.dto";
// import { JwtAuthGuard } from "security/guards/jwt-auth.guard";
// import { RolesGuard } from "security/guards/rolesGuard/roles.guard";
// import { RoleDecorator } from "security/decorators/roles.decorator";
// import { UserRole } from "src/common/enums/users-roles.enum";
// import { GalleryItem } from "./entities/gallery-item.entity";

// @ApiTags("Event Gallery")
// @ApiBearerAuth()
// @Controller("event-gallery")
// @UseGuards(JwtAuthGuard, RolesGuard)
// export class EventGalleryController {
//   constructor(private readonly eventGalleryService: EventGalleryService) {}

//   @Post()
//   @UseInterceptors(FileInterceptor("file"))
//   @ApiOperation({
//     summary: "Upload gallery item",
//     description: "Upload a new image or media file to the event gallery",
//   })
//   @ApiConsumes("multipart/form-data")
//   @ApiBody({
//     description: "Gallery item upload",
//     type: CreateGalleryItemDto,
//   })
//   @ApiResponse({
//     status: 201,
//     description: "Gallery item uploaded successfully",
//     type: GalleryItem,
//   })
//   @ApiResponse({ status: 400, description: "Invalid input or file" })
//   @ApiResponse({ status: 401, description: "Unauthorized" })
//   create(
//     @Body() createGalleryItemDto: CreateGalleryItemDto,
//     @UploadedFile() file: Express.Multer.File,
//   ) {
//     return this.eventGalleryService.create(createGalleryItemDto, file);
//   }

//   @Post("batch")
//   @UseInterceptors(FilesInterceptor("files"))
//   @ApiOperation({
//     summary: "Batch upload gallery items",
//     description: "Upload multiple images or media files to the event gallery",
//   })
//   @ApiConsumes("multipart/form-data")
//   @ApiBody({
//     description: "Multiple gallery items upload",
//     type: CreateGalleryItemDto,
//   })
//   @ApiResponse({
//     status: 201,
//     description: "Gallery items uploaded successfully",
//     type: [GalleryItem],
//   })
//   @ApiResponse({ status: 400, description: "Invalid input or files" })
//   @ApiResponse({ status: 401, description: "Unauthorized" })
//   createBatch(
//     @Body() createGalleryItemDto: CreateGalleryItemDto,
//     @UploadedFiles() files: Express.Multer.File[],
//   ) {
//     return this.eventGalleryService.createBatch(createGalleryItemDto, files);
//   }

//   @Get()
//   @ApiOperation({
//     summary: "Get gallery items",
//     description: "Retrieve gallery items with optional filtering",
//   })
//   @ApiQuery({
//     name: "eventId",
//     required: false,
//     description: "Filter items by event ID",
//   })
//   @ApiQuery({
//     name: "type",
//     required: false,
//     description: "Filter items by media type (image, video)",
//   })
//   @ApiResponse({
//     status: 200,
//     description: "List of gallery items",
//     type: [GalleryItem],
//   })
//   @ApiResponse({ status: 401, description: "Unauthorized" })
//   findAll(@Query("eventId") eventId?: string, @Query("type") type?: string) {
//     return this.eventGalleryService.findAll({ eventId, type });
//   }

//   @Get(":id")
//   @ApiOperation({
//     summary: "Get gallery item by ID",
//     description: "Retrieve a specific gallery item",
//   })
//   @ApiParam({
//     name: "id",
//     description: "Gallery item ID",
//     example: "123e4567-e89b-12d3-a456-426614174000",
//   })
//   @ApiResponse({
//     status: 200,
//     description: "Gallery item found",
//     type: GalleryItem,
//   })
//   @ApiResponse({ status: 404, description: "Gallery item not found" })
//   @ApiResponse({ status: 401, description: "Unauthorized" })
//   findOne(@Param("id") id: string) {
//     return this.eventGalleryService.findOne(id);
//   }

//   @Patch(":id")
//   @ApiOperation({
//     summary: "Update gallery item",
//     description: "Update details of a gallery item",
//   })
//   @ApiParam({
//     name: "id",
//     description: "Gallery item ID",
//     example: "123e4567-e89b-12d3-a456-426614174000",
//   })
//   @ApiResponse({
//     status: 200,
//     description: "Gallery item updated successfully",
//     type: GalleryItem,
//   })
//   @ApiResponse({ status: 404, description: "Gallery item not found" })
//   @ApiResponse({ status: 401, description: "Unauthorized" })
//   update(
//     @Param("id") id: string,
//     @Body() updateGalleryItemDto: UpdateGalleryItemDto,
//   ) {
//     return this.eventGalleryService.update(id, updateGalleryItemDto);
//   }

//   @Delete(":id")
//   @ApiOperation({
//     summary: "Delete gallery item",
//     description: "Remove a gallery item",
//   })
//   @ApiParam({
//     name: "id",
//     description: "Gallery item ID",
//     example: "123e4567-e89b-12d3-a456-426614174000",
//   })
//   @ApiResponse({
//     status: 200,
//     description: "Gallery item deleted successfully",
//   })
//   @ApiResponse({ status: 404, description: "Gallery item not found" })
//   @ApiResponse({ status: 401, description: "Unauthorized" })
//   remove(@Param("id") id: string) {
//     return this.eventGalleryService.remove(id);
//   }

//   @Post(":id/feature")
//   @ApiOperation({
//     summary: "Feature gallery item",
//     description: "Set a gallery item as featured for the event",
//   })
//   @ApiParam({
//     name: "id",
//     description: "Gallery item ID",
//     example: "123e4567-e89b-12d3-a456-426614174000",
//   })
//   @ApiResponse({
//     status: 200,
//     description: "Gallery item featured successfully",
//     type: GalleryItem,
//   })
//   @ApiResponse({ status: 404, description: "Gallery item not found" })
//   @ApiResponse({ status: 401, description: "Unauthorized" })
//   setFeatured(@Param("id") id: string) {
//     return this.eventGalleryService.setFeatured(id);
//   }

//   @Delete(":id/feature")
//   @ApiOperation({
//     summary: "Unfeature gallery item",
//     description: "Remove featured status from a gallery item",
//   })
//   @ApiParam({
//     name: "id",
//     description: "Gallery item ID",
//     example: "123e4567-e89b-12d3-a456-426614174000",
//   })
//   @ApiResponse({
//     status: 200,
//     description: "Featured status removed successfully",
//     type: GalleryItem,
//   })
//   @ApiResponse({ status: 404, description: "Gallery item not found" })
//   @ApiResponse({ status: 401, description: "Unauthorized" })
//   removeFeatured(@Param("id") id: string) {
//     return this.eventGalleryService.removeFeatured(id);
//   }
// }

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

    return this.galleryService.createGalleryImage(galleryDto);
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
