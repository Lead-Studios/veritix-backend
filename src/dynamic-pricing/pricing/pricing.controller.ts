import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { UpdatePricingRuleDto } from './dto/update-pricing-rule.dto';
import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';
import { RolesGuard } from 'security/guards/rolesGuard/roles.guard';
import { RoleDecorator } from 'security/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/users-roles.enum';
import { PricingRule } from './entities/pricing-rule.entity';
import { CalculatePriceDto } from "./dto/calculate-price.dto";

@ApiTags("Dynamic Pricing")
@ApiBearerAuth()
@Controller("dynamic-pricing")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post("rules")
  @RoleDecorator(UserRole.Admin)
  @ApiOperation({
    summary: "Create pricing rule",
    description: "Create a new dynamic pricing rule for tickets",
  })
  @ApiResponse({
    status: 201,
    description: "Pricing rule created successfully",
    type: PricingRule,
  })
  @ApiResponse({ status: 400, description: "Invalid input" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  createRule(@Body() createPricingRuleDto: CreatePricingRuleDto) {
    return this.pricingService.createRule(createPricingRuleDto);
  }

  @Get("rules")
  @RoleDecorator(UserRole.Admin)
  @ApiOperation({
    summary: "Get all pricing rules",
    description: "Retrieve all dynamic pricing rules",
  })
  @ApiQuery({
    name: "eventId",
    required: false,
    description: "Filter rules by event ID",
  })
  @ApiResponse({
    status: 200,
    description: "List of pricing rules",
    type: [PricingRule],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  getAllRules(@Query("eventId") eventId?: string) {
    return this.pricingService.getAllRules(eventId);
  }

  @Get("rules/:id")
  @RoleDecorator(UserRole.Admin)
  @ApiOperation({
    summary: "Get pricing rule by ID",
    description: "Retrieve a specific pricing rule by ID",
  })
  @ApiParam({
    name: "id",
    description: "Pricing rule ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Pricing rule found",
    type: PricingRule,
  })
  @ApiResponse({ status: 404, description: "Rule not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  getRule(@Param("id") id: string) {
    return this.pricingService.getRule(id);
  }

  @Put("rules/:id")
  @RoleDecorator(UserRole.Admin)
  @ApiOperation({
    summary: "Update pricing rule",
    description: "Update an existing pricing rule",
  })
  @ApiParam({
    name: "id",
    description: "Pricing rule ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Pricing rule updated successfully",
    type: PricingRule,
  })
  @ApiResponse({ status: 404, description: "Rule not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  updateRule(
    @Param("id") id: string,
    @Body() updatePricingRuleDto: UpdatePricingRuleDto,
  ) {
    return this.pricingService.updateRule(id, updatePricingRuleDto);
  }

  @Delete("rules/:id")
  @RoleDecorator(UserRole.Admin)
  @ApiOperation({
    summary: "Delete pricing rule",
    description: "Remove a pricing rule",
  })
  @ApiParam({
    name: "id",
    description: "Pricing rule ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Pricing rule deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Rule not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  deleteRule(@Param("id") id: string) {
    return this.pricingService.deleteRule(id);
  }

  @Post("calculate/:eventId")
  @RoleDecorator(UserRole.Admin)
  @ApiOperation({
    summary: "Calculate dynamic prices",
    description: "Calculate ticket prices based on configured rules",
  })
  @ApiParam({
    name: "eventId",
    description: "Event ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiResponse({
    status: 200,
    description: "Dynamic prices calculated successfully",
    type: Object,
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  calculatePrices(@Body() eventInfo: CalculatePriceDto) {
    return this.pricingService.calculatePrice(eventInfo);
  }

  @Get("history/:eventId")
  @RoleDecorator(UserRole.Admin)
  @ApiOperation({
    summary: "Get price history",
    description: "Retrieve price adjustment history for an event",
  })
  @ApiParam({
    name: "eventId",
    description: "Event ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiQuery({
    name: "startDate",
    required: false,
    type: Date,
    description: "Start date for history lookup",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    type: Date,
    description: "End date for history lookup",
  })
  @ApiResponse({
    status: 200,
    description: "Price history retrieved successfully",
    type: Object,
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Requires Admin role" })
  getPriceHistory(
    @Param("eventId") eventId: string,
    @Query("startDate") startDate?: Date,
    @Query("endDate") endDate?: Date,
  ) {
    return this.pricingService.getPriceHistory(eventId, startDate, endDate);
  }
}

