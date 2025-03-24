import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { SponsorsService } from './providers/sponsors.service';
import { CreateSponsorDto } from './dtos/create-sponsor.dto';
import { UpdateSponsorDto } from './dtos/update-sponsor.dto';
import { UserRole } from 'src/common/enums/users-roles.enum';
import { RoleDecorator } from 'security/decorators/roles.decorator';
import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';
import { RolesGuard } from 'security/guards/rolesGuard/roles.guard';

@Controller('sponsors')
export class SponsorsController {
    constructor(private readonly sponsorsService: SponsorsService) {}

  @Post()
  @RoleDecorator(UserRole.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async createSponsors(@Body() createSponsorDto: CreateSponsorDto) {
    return this.sponsorsService.createSponsors(createSponsorDto)
  }

  @Get()
  async findAllSponsors() {
    return this.sponsorsService.findAllSponsors();
  }

  @Get(':id')
  async findOneSponsor(@Param('id') id: number) {
    return this.sponsorsService.findOneSponsor(id);
  }

  @Get('/events/:eventId')
  async findSponsorsByEvent(@Param('eventId') eventId: number) {
    return this.sponsorsService.findSponsorsByEvent(eventId);
  }

  @Put(':id')
  @RoleDecorator(UserRole.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async update(@Param('id') id: number, @Body() updateSponsorDto: UpdateSponsorDto) {
    return this.sponsorsService.updateSponsor(id, updateSponsorDto);
  }

  @Delete(':id')
  @RoleDecorator(UserRole.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async remove(@Param('id') id: number) {
    return this.sponsorsService.removeSponsor(id);
  }
}
