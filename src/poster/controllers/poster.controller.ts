import { Controller, Post, Get, Put, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { PosterService } from '../services/poster.service';
import { CreatePosterDto } from '../dtos/create-poster.dto';
import { UpdatePosterDto } from '../dtos/update-poster.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { File as MulterFile } from 'multer';

const imageUploadOptions: MulterOptions = {
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      return cb(new Error('Only JPEG and PNG images are allowed'), false);
    }
    cb(null, true);
  },
};

@ApiTags('Poster')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('posters')
export class PosterController {
  constructor(private readonly posterService: PosterService) {}

  @Post('upload-image')
  @ApiOperation({ summary: 'Upload poster image' })
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  @Roles('admin')
  async uploadImage(@UploadedFile() file: MulterFile) {
    return { imageUrl: await this.posterService.uploadImageToS3(file) };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new poster' })
  @ApiBody({ type: CreatePosterDto })
  @Roles('admin')
  async create(@Body() dto: CreatePosterDto) {
    return this.posterService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all posters' })
  async findAll() {
    return this.posterService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single poster' })
  @ApiParam({ name: 'id', type: 'string' })
  async findOne(@Param('id') id: string) {
    return this.posterService.findOne(id);
  }

  @Get('/events/:eventId')
  @ApiOperation({ summary: 'Retrieve all posters for a specific event' })
  @ApiParam({ name: 'eventId', type: 'string' })
  async findByEvent(@Param('eventId') eventId: string) {
    return this.posterService.findByEvent(eventId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a poster' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ type: UpdatePosterDto })
  @Roles('admin')
  async update(@Param('id') id: string, @Body() dto: UpdatePosterDto) {
    return this.posterService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a poster' })
  @ApiParam({ name: 'id', type: 'string' })
  @Roles('admin')
  async remove(@Param('id') id: string) {
    return this.posterService.remove(id);
  }
} 