import { Controller, Post, Get, Put, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, ValidationPipe, UsePipes } from '@nestjs/common';
import { CollaboratorService } from '../services/collaborator.service';
import { CreateCollaboratorDto } from '../dtos/create-collaborator.dto';
import { UpdateCollaboratorDto } from '../dtos/update-collaborator.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { File as MulterFile } from 'multer';
import { CollaboratorResource } from '../resources/collaborator.resource';

const imageUploadOptions: MulterOptions = {
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      return cb(new Error('Only JPEG and PNG images are allowed'), false);
    }
    cb(null, true);
  },
};

@ApiTags('Collaborator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('collaborators')
export class CollaboratorController {
  constructor(private readonly collaboratorService: CollaboratorService) {}

  @Post('upload-image')
  @ApiOperation({ summary: 'Upload collaborator image' })
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  @Roles('admin')
  async uploadImage(@UploadedFile() file: MulterFile) {
    return { imageUrl: await this.collaboratorService.uploadImageToS3(file) };
  }

  @Post()
  @ApiOperation({ summary: 'Add a new event collaborator' })
  @ApiBody({ type: CreateCollaboratorDto })
  @Roles('admin')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(@Body() dto: CreateCollaboratorDto) {
    const collaborator = await this.collaboratorService.create(dto);
    return CollaboratorResource.toResponse(collaborator);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all collaborators' })
  async findAll() {
    const collaborators = await this.collaboratorService.findAll();
    return CollaboratorResource.toArray(collaborators);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single collaborator' })
  @ApiParam({ name: 'id', type: 'string' })
  async findOne(@Param('id') id: string) {
    const collaborator = await this.collaboratorService.findOne(id);
    return CollaboratorResource.toResponse(collaborator);
  }

  @Get('/events/:eventId')
  @ApiOperation({ summary: 'Retrieve all collaborators for a specific event' })
  @ApiParam({ name: 'eventId', type: 'string' })
  async findByEvent(@Param('eventId') eventId: string) {
    const collaborators = await this.collaboratorService.findByEvent(eventId);
    return CollaboratorResource.toArray(collaborators);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a collaborator' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ type: UpdateCollaboratorDto })
  @Roles('admin')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async update(@Param('id') id: string, @Body() dto: UpdateCollaboratorDto) {
    const collaborator = await this.collaboratorService.update(id, dto);
    return CollaboratorResource.toResponse(collaborator);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a collaborator' })
  @ApiParam({ name: 'id', type: 'string' })
  @Roles('admin')
  async remove(@Param('id') id: string) {
    return this.collaboratorService.remove(id);
  }
} 