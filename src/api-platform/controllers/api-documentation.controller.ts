import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ApiDocumentation, DocumentationType, DocumentationStatus } from '../entities/api-documentation.entity';
import { RequireApiPermissions, ApiAdmin, ApiWrite } from '../decorators/api-decorators';
import { ApiPermission } from '../entities/api-key.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

export class CreateDocumentationDto {
  title: string;
  type: DocumentationType;
  endpoint?: string;
  method?: string;
  description?: string;
  parameters?: Record<string, any>;
  responses?: Record<string, any>;
  examples?: Record<string, any>;
  version?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

@ApiTags('API Platform - Documentation')
@ApiBearerAuth()
@Controller('api/v1/docs')
export class ApiDocumentationController {
  constructor(
    @InjectRepository(ApiDocumentation)
    private documentationRepository: Repository<ApiDocumentation>,
  ) {}

  @Post()
  @ApiWrite()
  @ApiOperation({ summary: 'Create API documentation' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Documentation created successfully' })
  async create(@Body() createDto: CreateDocumentationDto): Promise<ApiDocumentation> {
    const documentation = this.documentationRepository.create({
      ...createDto,
      status: DocumentationStatus.DRAFT,
      sortOrder: 0,
    });

    return this.documentationRepository.save(documentation);
  }

  @Get()
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get all API documentation' })
  @ApiQuery({ name: 'type', required: false, enum: DocumentationType })
  @ApiQuery({ name: 'status', required: false, enum: DocumentationStatus })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Documentation retrieved successfully' })
  async findAll(
    @Query('type') type?: DocumentationType,
    @Query('status') status?: DocumentationStatus,
    @Query('category') category?: string,
  ): Promise<ApiDocumentation[]> {
    const queryBuilder = this.documentationRepository.createQueryBuilder('doc');

    if (type) {
      queryBuilder.andWhere('doc.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('doc.status = :status', { status });
    }

    if (category) {
      queryBuilder.andWhere('doc.category = :category', { category });
    }

    return queryBuilder
      .orderBy('doc.category', 'ASC')
      .addOrderBy('doc.sortOrder', 'ASC')
      .addOrderBy('doc.title', 'ASC')
      .getMany();
  }

  @Get('interactive')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get interactive API documentation' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Interactive documentation retrieved' })
  async getInteractive(): Promise<any> {
    const endpoints = await this.documentationRepository.find({
      where: { 
        type: DocumentationType.ENDPOINT,
        status: DocumentationStatus.PUBLISHED 
      },
      order: { category: 'ASC', sortOrder: 'ASC' },
    });

    // Group by category for better organization
    const grouped = endpoints.reduce((acc, doc) => {
      const category = doc.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        title: doc.title,
        endpoint: doc.endpoint,
        method: doc.method,
        description: doc.description,
        parameters: doc.parameters,
        responses: doc.responses,
        examples: doc.examples,
      });
      return acc;
    }, {});

    return grouped;
  }

  @Get(':id')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get documentation by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Documentation found' })
  async findOne(@Param('id') id: string): Promise<ApiDocumentation> {
    const documentation = await this.documentationRepository.findOne({
      where: { id },
    });

    if (!documentation) {
      throw new NotFoundException('Documentation not found');
    }

    return documentation;
  }

  @Patch(':id')
  @ApiWrite()
  @ApiOperation({ summary: 'Update documentation' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Documentation updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateDocumentationDto>,
  ): Promise<ApiDocumentation> {
    const documentation = await this.findOne(id);
    
    Object.assign(documentation, updateDto);
    documentation.updatedAt = new Date();

    return this.documentationRepository.save(documentation);
  }

  @Post(':id/publish')
  @ApiWrite()
  @ApiOperation({ summary: 'Publish documentation' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Documentation published successfully' })
  async publish(@Param('id') id: string): Promise<ApiDocumentation> {
    const documentation = await this.findOne(id);
    
    documentation.status = DocumentationStatus.PUBLISHED;
    documentation.updatedAt = new Date();

    return this.documentationRepository.save(documentation);
  }

  @Delete(':id')
  @ApiAdmin()
  @ApiOperation({ summary: 'Delete documentation' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Documentation deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    const documentation = await this.findOne(id);
    await this.documentationRepository.remove(documentation);
  }
}
