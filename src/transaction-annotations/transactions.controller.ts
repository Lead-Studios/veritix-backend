import { Controller, Post, Get, Delete, Param, Query, Body, Req } from '@nestjs/common';
import { TransactionAnnotationService } from '../services/transaction-annotation.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionAnnotationService) {}

  @Post(':id/notes')
  addNote(@Param('id') id: string, @Body() dto, @Req() req) {
    return this.service.addNote(id, req.user.id, dto.content);
  }

  @Post(':id/tags')
  addTag(@Param('id') id: string, @Body() dto, @Req() req) {
    return this.service.addTag(id, req.user.id, dto.tag);
  }

  @Delete(':id/tags/:tag')
  removeTag(@Param('id') id: string, @Param('tag') tag: string, @Req() req) {
    return this.service.removeTag(id, req.user.id, tag);
  }

  @Get('search')
  search(@Query() query, @Req() req) {
    return this.service.search(req.user.id, query);
  }

  @Post('bulk-tag')
  bulkTag(@Body() dto, @Req() req) {
    return this.service.bulkTag(req.user.id, dto);
  }

  @Get('/users/me/tags')
  getTags(@Req() req) {
    return this.service.getUserTags(req.user.id);
  }

  @Get('/analytics/tags')
  analytics(@Req() req) {
    return this.service.tagAnalytics(req.user.id);
  }
}