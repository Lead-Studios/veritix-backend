import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PricingRule, PricingRuleStatus } from '../entities/pricing-rule.entity';
import { CreatePricingRuleDto } from '../dto/create-pricing-rule.dto';
import { UpdatePricingRuleDto } from '../dto/update-pricing-rule.dto';

@ApiTags('Pricing Rules Management')
@Controller('pricing-rules')
@ApiBearerAuth()
export class PricingRulesController {
  constructor(
    @InjectRepository(PricingRule)
    private pricingRuleRepository: Repository<PricingRule>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new pricing rule' })
  @ApiResponse({ status: 201, description: 'Pricing rule created successfully' })
  async createPricingRule(@Body() dto: CreatePricingRuleDto) {
    try {
      const pricingRule = this.pricingRuleRepository.create(dto);
      const savedRule = await this.pricingRuleRepository.save(pricingRule);
      
      return {
        success: true,
        data: savedRule,
        message: 'Pricing rule created successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Error creating pricing rule: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all pricing rules with optional filtering' })
  @ApiResponse({ status: 200, description: 'Pricing rules retrieved successfully' })
  async getPricingRules(
    @Query('eventId') eventId?: string,
    @Query('status') status?: PricingRuleStatus,
    @Query('type') type?: string,
    @Query('isActive') isActive?: boolean,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    try {
      const queryBuilder = this.pricingRuleRepository.createQueryBuilder('rule');

      if (eventId) {
        queryBuilder.andWhere('rule.eventId = :eventId', { eventId });
      }

      if (status) {
        queryBuilder.andWhere('rule.status = :status', { status });
      }

      if (type) {
        queryBuilder.andWhere('rule.type = :type', { type });
      }

      if (isActive !== undefined) {
        queryBuilder.andWhere('rule.isActive = :isActive', { isActive });
      }

      const [rules, total] = await queryBuilder
        .orderBy('rule.priority', 'DESC')
        .addOrderBy('rule.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return {
        success: true,
        data: rules,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new HttpException(
        `Error retrieving pricing rules: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific pricing rule by ID' })
  @ApiResponse({ status: 200, description: 'Pricing rule retrieved successfully' })
  async getPricingRule(@Param('id') id: string) {
    try {
      const rule = await this.pricingRuleRepository.findOne({
        where: { id },
        relations: ['event'],
      });

      if (!rule) {
        throw new HttpException('Pricing rule not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: rule,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error retrieving pricing rule: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a pricing rule' })
  @ApiResponse({ status: 200, description: 'Pricing rule updated successfully' })
  async updatePricingRule(
    @Param('id') id: string,
    @Body() dto: UpdatePricingRuleDto,
  ) {
    try {
      const rule = await this.pricingRuleRepository.findOne({ where: { id } });

      if (!rule) {
        throw new HttpException('Pricing rule not found', HttpStatus.NOT_FOUND);
      }

      await this.pricingRuleRepository.update(id, dto);
      const updatedRule = await this.pricingRuleRepository.findOne({ where: { id } });

      return {
        success: true,
        data: updatedRule,
        message: 'Pricing rule updated successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error updating pricing rule: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a pricing rule' })
  @ApiResponse({ status: 200, description: 'Pricing rule deleted successfully' })
  async deletePricingRule(@Param('id') id: string) {
    try {
      const rule = await this.pricingRuleRepository.findOne({ where: { id } });

      if (!rule) {
        throw new HttpException('Pricing rule not found', HttpStatus.NOT_FOUND);
      }

      await this.pricingRuleRepository.delete(id);

      return {
        success: true,
        message: 'Pricing rule deleted successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error deleting pricing rule: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Activate a pricing rule' })
  @ApiResponse({ status: 200, description: 'Pricing rule activated successfully' })
  async activatePricingRule(@Param('id') id: string) {
    try {
      const rule = await this.pricingRuleRepository.findOne({ where: { id } });

      if (!rule) {
        throw new HttpException('Pricing rule not found', HttpStatus.NOT_FOUND);
      }

      await this.pricingRuleRepository.update(id, {
        isActive: true,
        status: PricingRuleStatus.ACTIVE,
      });

      return {
        success: true,
        message: 'Pricing rule activated successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error activating pricing rule: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a pricing rule' })
  @ApiResponse({ status: 200, description: 'Pricing rule deactivated successfully' })
  async deactivatePricingRule(@Param('id') id: string) {
    try {
      const rule = await this.pricingRuleRepository.findOne({ where: { id } });

      if (!rule) {
        throw new HttpException('Pricing rule not found', HttpStatus.NOT_FOUND);
      }

      await this.pricingRuleRepository.update(id, {
        isActive: false,
        status: PricingRuleStatus.INACTIVE,
      });

      return {
        success: true,
        message: 'Pricing rule deactivated successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error deactivating pricing rule: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('event/:eventId/active')
  @ApiOperation({ summary: 'Get active pricing rules for a specific event' })
  @ApiResponse({ status: 200, description: 'Active pricing rules retrieved successfully' })
  async getActivePricingRules(@Param('eventId') eventId: string) {
    try {
      const rules = await this.pricingRuleRepository.find({
        where: {
          eventId,
          isActive: true,
          status: PricingRuleStatus.ACTIVE,
        },
        order: {
          priority: 'DESC',
          createdAt: 'DESC',
        },
      });

      return {
        success: true,
        data: rules,
        count: rules.length,
      };
    } catch (error) {
      throw new HttpException(
        `Error retrieving active pricing rules: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a pricing rule' })
  @ApiResponse({ status: 201, description: 'Pricing rule duplicated successfully' })
  async duplicatePricingRule(
    @Param('id') id: string,
    @Body() data: { name?: string; eventId?: string },
  ) {
    try {
      const originalRule = await this.pricingRuleRepository.findOne({ where: { id } });

      if (!originalRule) {
        throw new HttpException('Pricing rule not found', HttpStatus.NOT_FOUND);
      }

      const duplicatedRule = this.pricingRuleRepository.create({
        ...originalRule,
        id: undefined, // Let TypeORM generate a new ID
        name: data.name || `${originalRule.name} (Copy)`,
        eventId: data.eventId || originalRule.eventId,
        status: PricingRuleStatus.DRAFT,
        isActive: false,
        createdAt: undefined,
        updatedAt: undefined,
      });

      const savedRule = await this.pricingRuleRepository.save(duplicatedRule);

      return {
        success: true,
        data: savedRule,
        message: 'Pricing rule duplicated successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error duplicating pricing rule: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('bulk-update')
  @ApiOperation({ summary: 'Bulk update multiple pricing rules' })
  @ApiResponse({ status: 200, description: 'Pricing rules updated successfully' })
  async bulkUpdatePricingRules(
    @Body() data: {
      ruleIds: string[];
      updates: Partial<UpdatePricingRuleDto>;
    },
  ) {
    try {
      const { ruleIds, updates } = data;

      if (!ruleIds || ruleIds.length === 0) {
        throw new HttpException('Rule IDs are required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.pricingRuleRepository.update(
        { id: { $in: ruleIds } as any },
        updates,
      );

      return {
        success: true,
        message: `${result.affected || 0} pricing rules updated successfully`,
        affectedCount: result.affected || 0,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error bulk updating pricing rules: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('templates/default')
  @ApiOperation({ summary: 'Get default pricing rule templates' })
  @ApiResponse({ status: 200, description: 'Default templates retrieved successfully' })
  async getDefaultTemplates() {
    try {
      const templates = [
        {
          name: 'Early Bird Discount',
          type: 'time_based',
          description: 'Automatic discount for early purchases',
          conditions: {
            timeRanges: [
              {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                multiplier: 0.8,
              },
            ],
          },
          minMultiplier: 0.7,
          maxMultiplier: 1.0,
        },
        {
          name: 'High Demand Premium',
          type: 'demand_based',
          description: 'Price increase based on high demand',
          conditions: {
            demandThresholds: [
              { minDemand: 80, maxDemand: 100, multiplier: 1.3 },
              { minDemand: 60, maxDemand: 79, multiplier: 1.15 },
            ],
          },
          minMultiplier: 1.0,
          maxMultiplier: 1.5,
        },
        {
          name: 'Low Inventory Premium',
          type: 'inventory_based',
          description: 'Scarcity pricing when inventory is low',
          conditions: {
            inventoryThresholds: [
              { minInventory: 0, maxInventory: 10, multiplier: 1.4 },
              { minInventory: 11, maxInventory: 25, multiplier: 1.2 },
            ],
          },
          minMultiplier: 1.0,
          maxMultiplier: 1.5,
        },
        {
          name: 'Last Minute Premium',
          type: 'time_based',
          description: 'Premium pricing for last-minute purchases',
          conditions: {
            timeRanges: [
              {
                startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString(),
                multiplier: 1.2,
              },
            ],
          },
          minMultiplier: 1.0,
          maxMultiplier: 1.3,
        },
      ];

      return {
        success: true,
        data: templates,
        count: templates.length,
      };
    } catch (error) {
      throw new HttpException(
        `Error retrieving default templates: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
