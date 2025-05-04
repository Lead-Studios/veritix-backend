import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete, 
  UseGuards, 
  ParseIntPipe
} from '@nestjs/common';
import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';
import { RolesGuard } from 'security/guards/rolesGuard/roles.guard';
import { Roles } from 'src/dynamic-pricing/auth/decorators/roles.decorator';
import { SpecialSpeakerService } from './special-speaker.service';
import { CreateSpecialSpeakerDto } from './dto/create-special-speaker.dto';
import { UpdateSpecialSpeakerDto } from './dto/update-special-speaker.dto';
import { UserRole } from 'src/common/enums/users-roles.enum';
import { RoleDecorator } from 'security/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('special-speaker')
export class SpecialSpeakerController {
  constructor(private readonly service: SpecialSpeakerService) {}

  @Post()
  @RoleDecorator(UserRole.Organizer)
  create(@Body() dto: CreateSpecialSpeakerDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get('/conference/:conferenceId')
  findByConference(@Param('conferenceId', ParseIntPipe) conferenceId: number) {
    return this.service.findByConference(conferenceId);
  }

  @Put(':id')
  @RoleDecorator(UserRole.Organizer)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSpecialSpeakerDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RoleDecorator(UserRole.Organizer)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
