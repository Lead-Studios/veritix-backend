import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SetllaService } from './setlla.service';
import { CreateSetllaDto } from './dto/create-setlla.dto';
import { UpdateSetllaDto } from './dto/update-setlla.dto';

@Controller('setlla')
export class SetllaController {
  constructor(private readonly setllaService: SetllaService) {}

  @Post()
  create(@Body() createSetllaDto: CreateSetllaDto) {
    return this.setllaService.create(createSetllaDto);
  }

  @Get()
  findAll() {
    return this.setllaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.setllaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSetllaDto: UpdateSetllaDto) {
    return this.setllaService.update(+id, updateSetllaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.setllaService.remove(+id);
  }
}
