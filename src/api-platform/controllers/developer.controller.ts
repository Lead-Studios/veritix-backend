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
import { Developer, DeveloperStatus, DeveloperTier } from '../entities/developer.entity';
import { RequireApiPermissions, ApiAdmin, ApiWrite } from '../decorators/api-decorators';
import { ApiPermission } from '../entities/api-key.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

export class CreateDeveloperDto {
  email: string;
  name: string;
  company?: string;
  website?: string;
  tier?: DeveloperTier;
  preferences?: Record<string, any>;
  tenantId: string;
}

export class UpdateDeveloperDto {
  name?: string;
  company?: string;
  website?: string;
  tier?: DeveloperTier;
  preferences?: Record<string, any>;
  status?: DeveloperStatus;
}

@ApiTags('API Platform - Developers')
@ApiBearerAuth()
@Controller('api/v1/developers')
export class DeveloperController {
  constructor(
    @InjectRepository(Developer)
    private developerRepository: Repository<Developer>,
  ) {}

  @Post()
  @ApiWrite()
  @ApiOperation({ summary: 'Create new developer account' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Developer account created successfully' })
  async create(@Body() createDeveloperDto: CreateDeveloperDto): Promise<Developer> {
    // Check if developer already exists
    const existingDeveloper = await this.developerRepository.findOne({
      where: { email: createDeveloperDto.email, tenantId: createDeveloperDto.tenantId },
    });

    if (existingDeveloper) {
      throw new BadRequestException('Developer with this email already exists');
    }

    const developer = this.developerRepository.create({
      ...createDeveloperDto,
      status: DeveloperStatus.PENDING,
      tier: createDeveloperDto.tier || DeveloperTier.FREE,
      emailVerified: false,
      totalRequests: 0,
      lastActiveAt: new Date(),
    });

    return this.developerRepository.save(developer);
  }

  @Get()
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get all developers' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: DeveloperStatus })
  @ApiQuery({ name: 'tier', required: false, enum: DeveloperTier })
  @ApiResponse({ status: HttpStatus.OK, description: 'Developers retrieved successfully' })
  async findAll(
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: DeveloperStatus,
    @Query('tier') tier?: DeveloperTier,
  ): Promise<Developer[]> {
    const queryBuilder = this.developerRepository.createQueryBuilder('developer');

    if (tenantId) {
      queryBuilder.andWhere('developer.tenantId = :tenantId', { tenantId });
    }

    if (status) {
      queryBuilder.andWhere('developer.status = :status', { status });
    }

    if (tier) {
      queryBuilder.andWhere('developer.tier = :tier', { tier });
    }

    return queryBuilder
      .leftJoinAndSelect('developer.apiKeys', 'apiKeys')
      .leftJoinAndSelect('developer.webhooks', 'webhooks')
      .orderBy('developer.createdAt', 'DESC')
      .getMany();
  }

  @Get(':id')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get developer by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Developer found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Developer not found' })
  async findOne(@Param('id') id: string): Promise<Developer> {
    const developer = await this.developerRepository.findOne({
      where: { id },
      relations: ['apiKeys', 'webhooks'],
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    return developer;
  }

  @Patch(':id')
  @ApiWrite()
  @ApiOperation({ summary: 'Update developer' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Developer updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateDeveloperDto: UpdateDeveloperDto,
  ): Promise<Developer> {
    const developer = await this.findOne(id);
    
    Object.assign(developer, updateDeveloperDto);
    developer.updatedAt = new Date();

    return this.developerRepository.save(developer);
  }

  @Post(':id/verify-email')
  @ApiWrite()
  @ApiOperation({ summary: 'Verify developer email' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Email verified successfully' })
  async verifyEmail(@Param('id') id: string): Promise<Developer> {
    const developer = await this.findOne(id);
    
    developer.emailVerified = true;
    developer.status = DeveloperStatus.ACTIVE;
    developer.updatedAt = new Date();

    return this.developerRepository.save(developer);
  }

  @Post(':id/suspend')
  @ApiAdmin()
  @ApiOperation({ summary: 'Suspend developer account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Developer suspended successfully' })
  async suspend(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<Developer> {
    const developer = await this.findOne(id);
    
    developer.status = DeveloperStatus.SUSPENDED;
    developer.updatedAt = new Date();

    if (reason) {
      developer.preferences = {
        ...developer.preferences,
        suspensionReason: reason,
      };
    }

    return this.developerRepository.save(developer);
  }

  @Post(':id/activate')
  @ApiAdmin()
  @ApiOperation({ summary: 'Activate developer account' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Developer activated successfully' })
  async activate(@Param('id') id: string): Promise<Developer> {
    const developer = await this.findOne(id);
    
    developer.status = DeveloperStatus.ACTIVE;
    developer.updatedAt = new Date();

    // Remove suspension reason if exists
    if (developer.preferences?.suspensionReason) {
      const { suspensionReason, ...preferences } = developer.preferences;
      developer.preferences = preferences;
    }

    return this.developerRepository.save(developer);
  }

  @Get(':id/usage')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get developer usage statistics' })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  @ApiResponse({ status: HttpStatus.OK, description: 'Usage statistics retrieved' })
  async getUsage(
    @Param('id') id: string,
    @Query('days') days?: number,
  ): Promise<any> {
    const developer = await this.findOne(id);
    const daysToAnalyze = days ? parseInt(days.toString()) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToAnalyze);

    // This would typically involve querying the ApiUsage entity
    // For now, return basic stats from the developer entity
    return {
      totalRequests: developer.totalRequests,
      lastActiveAt: developer.lastActiveAt,
      apiKeysCount: developer.apiKeys?.length || 0,
      webhooksCount: developer.webhooks?.length || 0,
      tier: developer.tier,
      status: developer.status,
    };
  }

  @Delete(':id')
  @ApiAdmin()
  @ApiOperation({ summary: 'Delete developer account' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Developer deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    const developer = await this.findOne(id);
    await this.developerRepository.remove(developer);
  }
}
