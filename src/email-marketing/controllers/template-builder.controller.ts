import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { TemplateBuilderService, TemplateLayout, DragDropComponent } from '../services/template-builder.service';

@ApiTags('Template Builder')
@Controller('email-marketing/template-builder')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TemplateBuilderController {
  constructor(private readonly templateBuilderService: TemplateBuilderService) {}

  @Get('components')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Get component library for drag-and-drop builder' })
  @ApiResponse({ status: 200, description: 'Component library retrieved successfully' })
  async getComponentLibrary() {
    return this.templateBuilderService.getComponentLibrary();
  }

  @Get(':templateId/layout')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Get template layout for builder' })
  @ApiResponse({ status: 200, description: 'Template layout retrieved successfully' })
  async getTemplateLayout(@Param('templateId') templateId: string) {
    return this.templateBuilderService.getTemplateLayout(templateId);
  }

  @Post(':templateId/layout')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Save template layout from builder' })
  @ApiResponse({ status: 200, description: 'Template layout saved successfully' })
  async saveTemplateLayout(
    @Param('templateId') templateId: string,
    @Body() layout: TemplateLayout,
  ) {
    return this.templateBuilderService.saveTemplateLayout(templateId, layout);
  }

  @Post(':templateId/components')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Add component to template' })
  @ApiResponse({ status: 201, description: 'Component added successfully' })
  async addComponent(
    @Param('templateId') templateId: string,
    @Body() component: Omit<DragDropComponent, 'id'>,
  ) {
    return this.templateBuilderService.addComponent(templateId, component);
  }

  @Patch('components/:componentId')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Update component properties' })
  @ApiResponse({ status: 200, description: 'Component updated successfully' })
  async updateComponent(
    @Param('componentId') componentId: string,
    @Body() updates: Partial<DragDropComponent>,
  ) {
    return this.templateBuilderService.updateComponent(componentId, updates);
  }

  @Post('components/:componentId/duplicate')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Duplicate component' })
  @ApiResponse({ status: 201, description: 'Component duplicated successfully' })
  async duplicateComponent(@Param('componentId') componentId: string) {
    return this.templateBuilderService.duplicateComponent(componentId);
  }

  @Delete('components/:componentId')
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete component' })
  @ApiResponse({ status: 204, description: 'Component deleted successfully' })
  async deleteComponent(@Param('componentId') componentId: string) {
    await this.templateBuilderService.deleteComponent(componentId);
  }
}
