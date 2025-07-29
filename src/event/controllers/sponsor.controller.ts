import { Controller, Post, Get, Put, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, ValidationPipe, UsePipes } from '@nestjs/common';
import { SponsorService } from '../services/sponsor.service';
import { CreateSponsorDto } from '../dtos/create-sponsor.dto';
import { UpdateSponsorDto } from '../dtos/update-sponsor.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { File as MulterFile } from 'multer';
import { SponsorResource } from '../resources/sponsor.resource';

const imageUploadOptions: MulterOptions = {
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      return cb(new Error('Only JPEG and PNG images are allowed'), false);
    }
    cb(null, true);
  },
};

@ApiTags('Sponsor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sponsors')
export class SponsorController {
  constructor(private readonly sponsorService: SponsorService) {}

  @Post('upload-image')
  @ApiOperation({ summary: 'Upload sponsor brand image' })
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  @Roles('admin')
  async uploadImage(@UploadedFile() file: MulterFile) {
    return { imageUrl: await this.sponsorService.uploadImageToS3(file) };
  }

  @Post()
  @ApiOperation({ summary: 'Add a new event sponsor' })
  @ApiBody({ type: CreateSponsorDto })
  @Roles('admin')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() dto: CreateSponsorDto) {
    const sponsor = await this.sponsorService.create(dto);
    return SponsorResource.toResponse(sponsor);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all sponsors' })
  async findAll() {
    const sponsors = await this.sponsorService.findAll();
    return SponsorResource.toArray(sponsors);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single sponsor' })
  @ApiParam({ name: 'id', type: 'string' })
  async findOne(@Param('id') id: string) {
    const sponsor = await this.sponsorService.findOne(id);
    return SponsorResource.toResponse(sponsor);
  }

  @Get('/events/:eventId')
  @ApiOperation({ summary: 'Retrieve all sponsors for a specific event' })
  @ApiParam({ name: 'eventId', type: 'string' })
  async findByEvent(@Param('eventId') eventId: string) {
    const sponsors = await this.sponsorService.findByEvent(eventId);
    return SponsorResource.toArray(sponsors);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a sponsor' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ type: UpdateSponsorDto })
  @Roles('admin')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async update(@Param('id') id: string, @Body() dto: UpdateSponsorDto) {
    const sponsor = await this.sponsorService.update(id, dto);
    return SponsorResource.toResponse(sponsor);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sponsor' })
  @ApiParam({ name: 'id', type: 'string' })
  @Roles('admin')
  async remove(@Param('id') id: string) {
    return this.sponsorService.remove(id);
  }
} 