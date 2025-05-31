import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpStatus,
    UseFilters,
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
  } from '@nestjs/swagger';
  import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';
  import { RolesGuard } from 'security/guards/rolesGuard/roles.guard';
  import { UserRole } from 'src/common/enums/users-roles.enum';
  import { Roles } from "security/decorators/roles.decorator";
  import { AllExceptionsFilter } from "src/common/filters";
  import { CampaignService } from "./providers/campaign.service";
  import { DashboardService } from "./providers/dashboard.service";
  import { TicketService } from "./providers/ticket.service";
  import { CreateCampaignEmailDto } from "./dto/create-campaign-email.dto";
  import { UpdateCampaignEmailDto } from "./dto/update-campaign-email.dto";
  import { ResolveTicketDto } from "./dto/resolve-ticket.dto";
  import { AnalyticsResponseDto } from "./dto/analytics-response.dto";
  import { Logger } from "@nestjs/common";

  @ApiTags("Admin Campaign")
  @ApiBearerAuth()
  @Controller("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseFilters(AllExceptionsFilter)
  export class AdminCampaignController {
    private readonly logger = new Logger(AdminCampaignController.name);

    constructor(
      private readonly campaignService: CampaignService,
      private readonly dashboardService: DashboardService,
      private readonly ticketService: TicketService,
    ) {}

    @Get("dashboard")
    @ApiOperation({ summary: "Fetch app analytics" })
    @ApiResponse({
      status: HttpStatus.OK,
      description: "Analytics data retrieved successfully",
      type: AnalyticsResponseDto,
    })
    @ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: "Unauthorized",
    })
    @ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: "Forbidden resource",
    })
    async getAnalytics(): Promise<AnalyticsResponseDto> {
      try {
        this.logger.log("GET /admin/dashboard - Retrieving analytics");
        return await this.dashboardService.getAnalytics();
      } catch (error) {
        this.logger.error(
          `Error retrieving analytics: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }

    @Post("tickets/resolve")
    @ApiOperation({ summary: "Resolve ticket issues" })
    @ApiBody({ type: ResolveTicketDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: "Ticket resolved successfully",
    })
    @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: "Ticket not found",
    })
    @ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: "Unauthorized",
    })
    @ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: "Forbidden resource",
    })
    async resolveTicket(@Body() resolveTicketDto: ResolveTicketDto) {
      try {
        this.logger.log(
          `POST /admin/tickets/resolve - Resolving ticket: ${resolveTicketDto.ticketId}`,
        );
        return await this.ticketService.resolveTicket(resolveTicketDto);
      } catch (error) {
        this.logger.error(
          `Error resolving ticket: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }

    @Post("create/campaign-emails")
    @ApiOperation({ summary: "Create campaign email" })
    @ApiBody({ type: CreateCampaignEmailDto })
    @ApiResponse({
      status: HttpStatus.CREATED,
      description: "Campaign email created successfully",
    })
    @ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: "Unauthorized",
    })
    @ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: "Forbidden resource",
    })
    async createCampaignEmail(
      @Body() createCampaignEmailDto: CreateCampaignEmailDto,
    ) {
      try {
        this.logger.log(
          "POST /admin/create/campaign-emails - Creating campaign email",
        );
        return await this.campaignService.createCampaignEmail(
          createCampaignEmailDto,
        );
      } catch (error) {
        this.logger.error(
          `Error creating campaign email: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }

    @Get("retrieve/campaign-emails")
    @ApiOperation({ summary: "Retrieve all campaign emails" })
    @ApiResponse({
      status: HttpStatus.OK,
      description: "Campaign emails retrieved successfully",
    })
    @ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: "Unauthorized",
    })
    @ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: "Forbidden resource",
    })
    async getAllCampaignEmails() {
      try {
        this.logger.log(
          "GET /admin/retrieve/campaign-emails - Retrieving all campaign emails",
        );
        return await this.campaignService.getAllCampaignEmails();
      } catch (error) {
        this.logger.error(
          `Error retrieving campaign emails: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }

    @Get("retrieve/campaign-emails/:id")
    @ApiOperation({ summary: "Retrieve a single campaign email" })
    @ApiParam({ name: "id", description: "Campaign email ID" })
    @ApiResponse({
      status: HttpStatus.OK,
      description: "Campaign email retrieved successfully",
    })
    @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: "Campaign email not found",
    })
    @ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: "Unauthorized",
    })
    @ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: "Forbidden resource",
    })
    async getCampaignEmailById(@Param("id") id: string) {
      try {
        this.logger.log(
          `GET /admin/retrieve/campaign-emails/${id} - Retrieving campaign email`,
        );
        return await this.campaignService.getCampaignEmailById(id);
      } catch (error) {
        this.logger.error(
          `Error retrieving campaign email: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }

    @Put("update/campaign-emails/:id")
    @ApiOperation({ summary: "Update campaign email" })
    @ApiParam({ name: "id", description: "Campaign email ID" })
    @ApiBody({ type: UpdateCampaignEmailDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: "Campaign email updated successfully",
    })
    @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: "Campaign email not found",
    })
    @ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: "Unauthorized",
    })
    @ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: "Forbidden resource",
    })
    async updateCampaignEmail(
      @Param("id") id: string,
      @Body() updateCampaignEmailDto: UpdateCampaignEmailDto,
    ) {
      try {
        this.logger.log(
          `PUT /admin/update/campaign-emails/${id} - Updating campaign email`,
        );
        return await this.campaignService.updateCampaignEmail(
          id,
          updateCampaignEmailDto,
        );
      } catch (error) {
        this.logger.error(
          `Error updating campaign email: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }

    @Delete("delete/campaign-emails/:id")
    @ApiOperation({ summary: "Delete campaign email" })
    @ApiParam({ name: "id", description: "Campaign email ID" })
    @ApiResponse({
      status: HttpStatus.OK,
      description: "Campaign email deleted successfully",
    })
    @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: "Campaign email not found",
    })
    @ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: "Unauthorized",
    })
    @ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: "Forbidden resource",
    })
    async deleteCampaignEmail(@Param("id") id: string) {
      try {
        this.logger.log(
          `DELETE /admin/delete/campaign-emails/${id} - Deleting campaign email`,
        );
        await this.campaignService.deleteCampaignEmail(id);
        return { message: "Campaign email deleted successfully" };
      } catch (error) {
        this.logger.error(
          `Error deleting campaign email: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }
  } 
