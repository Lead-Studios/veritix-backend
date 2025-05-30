import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete, 
  UseGuards, 
  ParseUUIDPipe,
  Query
} from '@nestjs/common';
import { ConferenceService } from '../providers/conference.service';
import { CreateConferenceDto, UpdateConferenceDto } from '../dto';
import { Conference } from '../entities/conference.entity';
import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';
import { RolesGuard } from 'security/guards/rolesGuard/roles.guard';
import { Roles } from 'src/dynamic-pricing/auth/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/users-roles.enum';
import { RoleDecorator } from 'security/decorators/roles.decorator';

@Controller('conference')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConferenceController {
  constructor(private readonly conferenceService: ConferenceService) {}

  @Post()
  @RoleDecorator(UserRole.Admin, UserRole.Organizer)
  create(@Body() createConferenceDto: CreateConferenceDto): Promise<Conference> {
    return this.conferenceService.create(createConferenceDto);
  }

  @Get()
  findAll(): Promise<Conference[]> {
    return this.conferenceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Conference> {
    return this.conferenceService.findOne(id);
  }

  @Put(':id')
  @RoleDecorator(UserRole.Admin, UserRole.Organizer)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateConferenceDto: UpdateConferenceDto,
  ): Promise<Conference> {
    return this.conferenceService.update(id, updateConferenceDto);
  }

  @Delete(':id')
  @RoleDecorator(UserRole.Admin)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.conferenceService.remove(id);
  }

   @Get('search')
  async search(
    @Query('query') query: string,
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = Math.min(parseInt(limit) || 10, 100); // max 100
    const offsetNum = parseInt(offset) || 0;

    return this.conferenceService.search(query, category, location, limitNum, offsetNum);
  }
}