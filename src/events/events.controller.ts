import {
  Controller,
  Post,
  Body,
  UseGuards,
  Delete,
  Param,
  Get,
  Query,
  Patch,
  UseInterceptors,
  UploadedFile,
  UnsupportedMediaTypeException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { EventStatus } from './enums/event-status.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  async create(@Body() createEventDto: CreateEventDto, @CurrentUser() user: User) {
    return await this.eventsService.createEvent(createEventDto, user);
  }

  @Get()
  async findAll(@Query() query: EventQueryDto) {
    return await this.eventsService.findAll(query);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  async findMyEvents(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return await this.eventsService.findByOrganizer(user.id, pagination);
  }

  @Get(':id/capacity')
  async getCapacity(@Param('id') id: string) {
    return await this.eventsService.getCapacity(id);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return await this.eventsService.getById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateEventDto, @CurrentUser() user: User) {
    return await this.eventsService.update(id, dto, user);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async changeStatus(
    @Param('id') id: string,
    @Body('status') status: EventStatus,
    @CurrentUser() user: User,
  ) {
    return await this.eventsService.changeStatus(id, status, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.eventsService.remove(id, user);
    return { message: 'Event archived successfully' };
  }

  @Post(':id/image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file || !ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException('Only PNG, JPG, and WEBP images are allowed');
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new PayloadTooLargeException('Image must be 5MB or less');
    }
    return this.eventsService.uploadImage(id, file, user);
  }
}
