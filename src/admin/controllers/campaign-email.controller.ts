import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CampaignEmailService } from '../services/campaign-email.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateCampaignEmailDto } from '../dtos/create-campaign-email.dto';
import { UpdateCampaignEmailDto } from '../dtos/update-campaign-email.dto';
import { DeleteCampaignEmailDto } from '../dtos/delete-campaign-email.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class CampaignEmailController {
  constructor(private readonly campaignEmailService: CampaignEmailService) {}

  @Post('create/campaign-emails')
  @ApiOperation({ summary: 'Create campaign email' })
  @ApiBody({ type: CreateCampaignEmailDto })
  create(@Body() dto: CreateCampaignEmailDto) {
    return this.campaignEmailService.create(dto);
  }

  @Get('retrieve/campaign-emails')
  @ApiOperation({ summary: 'Retrieve all campaign emails' })
  findAll() {
    return this.campaignEmailService.findAll();
  }

  @Get('retrieve/campaign-emails/:id')
  @ApiOperation({ summary: 'Retrieve single campaign email' })
  findOne(@Param('id') id: string) {
    return this.campaignEmailService.findOne(id);
  }

  @Put('update/campaign-emails')
  @ApiOperation({ summary: 'Update campaign email' })
  @ApiBody({ type: UpdateCampaignEmailDto })
  update(@Body() dto: UpdateCampaignEmailDto) {
    return this.campaignEmailService.update(dto);
  }

  @Delete('delete/campaign-emails')
  @ApiOperation({ summary: 'Delete campaign email' })
  @ApiBody({ type: DeleteCampaignEmailDto })
  delete(@Body() dto: DeleteCampaignEmailDto) {
    return this.campaignEmailService.delete(dto.id);
  }
} 