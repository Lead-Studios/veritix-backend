import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiParam, 
  ApiQuery,
  ApiConsumes,
  ApiBody
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { EventGalleryService } from './event-gallery.service';
import { CreateGalleryItemDto } from './dto/create-gallery-item.dto';
import { UpdateGalleryItemDto } from './dto/update-gallery-item.dto';
import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';
import { RolesGuard } from 'security/guards/rolesGuard/roles.guard';
import { RoleDecorator } from 'security/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/users-roles.enum';
import { GalleryItem } from './entities/gallery-item.entity';

@ApiTags('Event Gallery')
@ApiBearerAuth()
@Controller('event-gallery')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventGalleryController {
  constructor(private readonly eventGalleryService: EventGalleryService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload gallery item',
    description: 'Upload a new image or media file to the event gallery'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Gallery item upload',
    type: CreateGalleryItemDto
  })
  @ApiResponse({
    status: 201,
    description: 'Gallery item uploaded successfully',
    type: GalleryItem
  })
  @ApiResponse({ status: 400, description: 'Invalid input or file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() createGalleryItemDto: CreateGalleryItemDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.eventGalleryService.createGalleryImage(createGalleryItemDto);
  }

  @Post('batch')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({
    summary: 'Batch upload gallery items',
    description: 'Upload multiple images or media files to the event gallery'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Multiple gallery items upload',
    type: CreateGalleryItemDto
  })
  @ApiResponse({
    status: 201,
    description: 'Gallery items uploaded successfully',
    type: [GalleryItem]
  })
  @ApiResponse({ status: 400, description: 'Invalid input or files' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createBatch(
    @Body() createGalleryItemDto: CreateGalleryItemDto,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    // return this.eventGalleryService.createBatch(createGalleryItemDto, files);
    return "Not Implemented";
  }

  @Get()
  @ApiOperation({
    summary: 'Get gallery items',
    description: 'Retrieve gallery items with optional filtering'
  })
  @ApiQuery({
    name: 'eventId',
    required: false,
    description: 'Filter items by event ID'
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter items by media type (image, video)'
  })
  @ApiResponse({
    status: 200,
    description: 'List of gallery items',
    type: [GalleryItem]
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @Query('eventId') eventId?: string,
    @Query('type') type?: string
  ) {
    return this.eventGalleryService.getAllImages();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get gallery item by ID',
    description: 'Retrieve a specific gallery item'
  })
  @ApiParam({
    name: 'id',
    description: 'Gallery item ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Gallery item found',
    type: GalleryItem
  })
  @ApiResponse({ status: 404, description: 'Gallery item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string) {
    return this.eventGalleryService.getImageById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update gallery item',
    description: 'Update details of a gallery item'
  })
  @ApiParam({
    name: 'id',
    description: 'Gallery item ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Gallery item updated successfully',
    type: GalleryItem
  })
  @ApiResponse({ status: 404, description: 'Gallery item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @Param('id') id: string,
    @Body() updateGalleryItemDto: UpdateGalleryItemDto
  ) {
    // return this.eventGalleryService.update(id, updateGalleryItemDto);
    return "Not Implemented";
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete gallery item',
    description: 'Remove a gallery item'
  })
  @ApiParam({
    name: 'id',
    description: 'Gallery item ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ status: 200, description: 'Gallery item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Gallery item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id') id: string) {
    return this.eventGalleryService.deleteImage(id);
  }

  @Post(':id/feature')
  @ApiOperation({
    summary: 'Feature gallery item',
    description: 'Set a gallery item as featured for the event'
  })
  @ApiParam({
    name: 'id',
    description: 'Gallery item ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Gallery item featured successfully',
    type: GalleryItem
  })
  @ApiResponse({ status: 404, description: 'Gallery item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  setFeatured(@Param('id') id: string) {
    // return this.eventGalleryService.setFeatured(id);
    return "Not Implemented";
  }

  @Delete(':id/feature')
  @ApiOperation({
    summary: 'Unfeature gallery item',
    description: 'Remove featured status from a gallery item'
  })
  @ApiParam({
    name: 'id',
    description: 'Gallery item ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'Featured status removed successfully',
    type: GalleryItem
  })
  @ApiResponse({ status: 404, description: 'Gallery item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  removeFeatured(@Param('id') id: string) {
    // return this.eventGalleryService.removeFeatured(id);
    return "Not Implemented";
  }
}
