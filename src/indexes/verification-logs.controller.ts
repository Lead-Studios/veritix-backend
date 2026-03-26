import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VerificationLogsService } from './verification-logs.service';
import { CreateVerificationLogDto } from './dto/create-verification-log.dto';
import { UpdateVerificationLogDto } from './dto/update-verification-log.dto';

@Controller('verification-logs')
export class VerificationLogsController {
  constructor(private readonly verificationLogsService: VerificationLogsService) {}

  @Post()
  create(@Body() createVerificationLogDto: CreateVerificationLogDto) {
    return this.verificationLogsService.create(createVerificationLogDto);
  }

  @Get()
  findAll() {
    return this.verificationLogsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.verificationLogsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVerificationLogDto: UpdateVerificationLogDto) {
    return this.verificationLogsService.update(+id, updateVerificationLogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.verificationLogsService.remove(+id);
  }
}
