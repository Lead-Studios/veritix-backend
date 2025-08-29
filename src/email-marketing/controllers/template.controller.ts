import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { TemplateService } from '../services/template.service';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { TemplateQueryDto } from '../dto/template-query.dto';
import { TemplateStatus, TemplateType } from '../entities/email-template.entity';

@ApiTags('Email Templates')
@Controller('email-marketing/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Create a new email template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async create(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templateService.create(createTemplateDto);
  }

  @Get()
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Get all email templates with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async findAll(@Query() query: TemplateQueryDto) {
    return this.templateService.findAll(query);
  }

  @Get('system')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Get system templates' })
  @ApiResponse({ status: 200, description: 'System templates retrieved successfully' })
  async getSystemTemplates() {
    return this.templateService.getSystemTemplates();
  }

  @Get('popular')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Get popular templates' })
  @ApiResponse({ status: 200, description: 'Popular templates retrieved successfully' })
  async getPopularTemplates(@Query('limit') limit?: number) {
    return this.templateService.getPopularTemplates(limit);
  }

  @Get('by-type/:type')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Get templates by type' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTemplatesByType(@Param('type') type: TemplateType) {
    return this.templateService.getTemplatesByType(type);
  }

  @Get('search')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Search templates' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchTemplates(
    @Query('q') searchTerm: string,
    @Query('type') templateType?: TemplateType,
    @Query('category') category?: string,
    @Query('tags') tags?: string,
  ) {
    const filters = {
      templateType,
      category,
      tags: tags ? tags.split(',') : undefined,
    };
    return this.templateService.searchTemplates(searchTerm, filters);
  }

  @Get(':id')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Get('slug/:slug')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Get template by slug' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  async findBySlug(@Param('slug') slug: string) {
    return this.templateService.findBySlug(slug);
  }

  @Patch(':id')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  async update(@Param('id') id: string, @Body() updateTemplateDto: UpdateTemplateDto) {
    return this.templateService.update(id, updateTemplateDto);
  }

  @Post(':id/duplicate')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Duplicate template' })
  @ApiResponse({ status: 201, description: 'Template duplicated successfully' })
  async duplicate(@Param('id') id: string, @Body('name') name: string) {
    return this.templateService.duplicate(id, name);
  }

  @Patch(':id/status')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Update template status' })
  @ApiResponse({ status: 200, description: 'Template status updated successfully' })
  async updateStatus(@Param('id') id: string, @Body('status') status: TemplateStatus) {
    return this.templateService.updateStatus(id, status);
  }

  @Post(':id/preview')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Generate template preview with variables' })
  @ApiResponse({ status: 200, description: 'Preview generated successfully' })
  async generatePreview(
    @Param('id') id: string,
    @Body('variables') variables: Record<string, any> = {},
  ) {
    return this.templateService.generatePreview(id, variables);
  }

  @Post(':id/usage')
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Increment template usage count' })
  @ApiResponse({ status: 204, description: 'Usage count incremented' })
  async incrementUsage(@Param('id') id: string) {
    await this.templateService.incrementUsage(id);
  }

  @Post(':id/rating')
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add rating to template' })
  @ApiResponse({ status: 204, description: 'Rating added successfully' })
  async addRating(@Param('id') id: string, @Body('rating') rating: number) {
    await this.templateService.updateRating(id, rating);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive template' })
  @ApiResponse({ status: 204, description: 'Template archived successfully' })
  async remove(@Param('id') id: string) {
    await this.templateService.remove(id);
  }
}
