import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  Query,
} from '@nestjs/common';
import { GalleryService } from '../services/gallery.service';
import {
  CreateGalleryImageDto,
  UpdateGalleryImageDto,
} from '../dtos/gallery.dto';
// import { AuthGuard, RolesGuard } from './auth.guard'; // Placeholder for real guards

@Controller()
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  // @UseGuards(AuthGuard, RolesGuard) // Add real guards here
  @Post('gallery')
  @UseGuards() // Add real guards: AuthGuard, RolesGuard
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() dto: CreateGalleryImageDto) {
    return this.galleryService.create(dto);
  }

  // @UseGuards(AuthGuard)
  @Get('gallery')
  @UseGuards() // Add real guard: AuthGuard
  findAll() {
    return this.galleryService.findAll();
  }

  // @UseGuards(AuthGuard)
  @Get('gallery/:id')
  @UseGuards() // Add real guard: AuthGuard
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.galleryService.findOne(id);
  }

  // @UseGuards(AuthGuard)
  @Get('events/:eventId/gallery')
  @UseGuards() // Add real guard: AuthGuard
  findByEvent(@Param('eventId', new ParseUUIDPipe()) eventId: string) {
    return this.galleryService.findByEvent(eventId);
  }

  // @UseGuards(AuthGuard, RolesGuard)
  @Put('gallery/:id')
  @UseGuards() // Add real guards: AuthGuard, RolesGuard
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGalleryImageDto,
  ) {
    return this.galleryService.update(id, dto);
  }

  // @UseGuards(AuthGuard, RolesGuard)
  @Delete('gallery/:id')
  @UseGuards() // Add real guards: AuthGuard, RolesGuard
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.galleryService.remove(id);
  }
}
