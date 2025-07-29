import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { SpecialGuestService } from '../services/special-guest.service';
import { CreateSpecialGuestDto } from '../dtos/create-special-guest.dto';
import { UpdateSpecialGuestDto } from '../dtos/update-special-guest.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { File as MulterFile } from 'multer';

// Image upload options (move outside the class)
const imageUploadOptions: MulterOptions = {
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      return cb(new Error('Only JPEG and PNG images are allowed'), false);
    }
    cb(null, true);
  },
};

@ApiTags('Special Guest')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('special-guests')
export class SpecialGuestController {
  constructor(private readonly specialGuestService: SpecialGuestService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new special guest' })
  @ApiBody({ type: CreateSpecialGuestDto })
  @Roles('admin')
  create(@Body() dto: CreateSpecialGuestDto) {
    return this.specialGuestService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all special guests' })
  findAll() {
    return this.specialGuestService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single special guest' })
  @ApiParam({ name: 'id', type: 'string' })
  findOne(@Param('id') id: string) {
    return this.specialGuestService.findOne(id);
  }

  @Get('/events/:eventId')
  @ApiOperation({ summary: 'Retrieve all special guests for a specific event' })
  @ApiParam({ name: 'eventId', type: 'string' })
  findByEvent(@Param('eventId') eventId: string) {
    return this.specialGuestService.findByEvent(eventId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a special guest' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ type: UpdateSpecialGuestDto })
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateSpecialGuestDto) {
    return this.specialGuestService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a special guest' })
  @ApiParam({ name: 'id', type: 'string' })
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.specialGuestService.remove(id);
  }

  @Post('upload-image')
  @ApiOperation({ summary: 'Upload special guest image' })
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  @Roles('admin')
  async uploadImage(@UploadedFile() file: MulterFile) {
    return { imageUrl: await this.specialGuestService.uploadImageToS3(file) };
  }
}
