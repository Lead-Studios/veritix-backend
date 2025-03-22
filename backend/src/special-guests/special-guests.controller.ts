import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SpecialGuestService } from './special-guests.service';
import { CreateSpecialGuestDto } from './dto/create-special-guest.dto';
import { JwtAuthGuard } from '../../security/guards/jwt-auth.guard';
import { RolesGuard } from '../../security/guards/rolesGuard/roles.guard';

@Controller('special-guests')
@UseGuards(JwtAuthGuard, RolesGuard) // Protect all routes
export class SpecialGuestController {
  constructor(private readonly specialGuestService: SpecialGuestService) {}

  @Post()
  //@Roles('admin') // Only admin can create special guests
  async createSpecialGuest(@Body() dto: CreateSpecialGuestDto) {
    return this.specialGuestService.createSpecialGuest(dto);
  }

  @Get()
  async getAllSpecialGuests() {
    return this.specialGuestService.getAllSpecialGuests();
  }

  @Get(':id')
  async getSpecialGuestById(@Param('id') id: string) {
    return this.specialGuestService.getSpecialGuestById(id);
  }

  @Put(':id')
  //@Roles('admin') // Only admin can update special guests
  async updateSpecialGuest(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSpecialGuestDto>,
  ) {
    return this.specialGuestService.updateSpecialGuest(id, dto);
  }

  @Delete(':id')
  //@Roles('admin') // Only admin can delete special guests
  async deleteSpecialGuest(@Param('id') id: string) {
    return this.specialGuestService.deleteSpecialGuest(id);
  }
}
