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
import { AutomationService } from '../services/automation.service';
import { WorkflowType, WorkflowStatus } from '../entities/automation-workflow.entity';
import { TriggerType } from '../entities/automation-trigger.entity';
import { ActionType } from '../entities/automation-action.entity';

@ApiTags('Email Automation')
@Controller('email-marketing/automation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post('workflows')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Create a new automation workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  async createWorkflow(@Body() workflowData: {
    name: string;
    description?: string;
    workflowType: WorkflowType;
    goalType?: string;
    goalValue?: number;
    settings?: Record<string, any>;
    createdBy?: string;
  }) {
    return this.automationService.createWorkflow(workflowData);
  }

  @Post('workflows/:id/triggers')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Add trigger to workflow' })
  @ApiResponse({ status: 201, description: 'Trigger added successfully' })
  async addTrigger(
    @Param('id') workflowId: string,
    @Body() triggerData: {
      triggerType: TriggerType;
      eventName: string;
      conditions?: Record<string, any>;
      filters?: Record<string, any>;
      delay?: number;
      delayUnit?: string;
    },
  ) {
    return this.automationService.addTrigger(workflowId, triggerData);
  }

  @Post('workflows/:id/actions')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Add action to workflow' })
  @ApiResponse({ status: 201, description: 'Action added successfully' })
  async addAction(
    @Param('id') workflowId: string,
    @Body() actionData: {
      actionType: ActionType;
      sortOrder: number;
      configuration: Record<string, any>;
      conditions?: Record<string, any>;
      delay?: number;
      delayUnit?: string;
    },
  ) {
    return this.automationService.addAction(workflowId, actionData);
  }

  @Post('workflows/:id/activate')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Activate workflow' })
  @ApiResponse({ status: 200, description: 'Workflow activated successfully' })
  async activateWorkflow(@Param('id') workflowId: string) {
    return this.automationService.activateWorkflow(workflowId);
  }

  @Post('workflows/:id/pause')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Pause workflow' })
  @ApiResponse({ status: 200, description: 'Workflow paused successfully' })
  async pauseWorkflow(@Param('id') workflowId: string) {
    return this.automationService.pauseWorkflow(workflowId);
  }

  @Post('workflows/:id/resume')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Resume workflow' })
  @ApiResponse({ status: 200, description: 'Workflow resumed successfully' })
  async resumeWorkflow(@Param('id') workflowId: string) {
    return this.automationService.resumeWorkflow(workflowId);
  }

  @Get('workflows/:id')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow retrieved successfully' })
  async getWorkflow(@Param('id') workflowId: string) {
    return this.automationService.findWorkflow(workflowId);
  }

  @Get('workflows/:id/stats')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Get workflow statistics' })
  @ApiResponse({ status: 200, description: 'Workflow statistics retrieved successfully' })
  async getWorkflowStats(@Param('id') workflowId: string) {
    return this.automationService.getWorkflowStats(workflowId);
  }

  @Post('events')
  @Roles('admin', 'organizer', 'system')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Process automation event' })
  @ApiResponse({ status: 204, description: 'Event processed successfully' })
  async processEvent(@Body() eventData: {
    eventName: string;
    data: Record<string, any>;
  }) {
    await this.automationService.processEvent(eventData.eventName, eventData.data);
  }

  @Delete('workflows/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({ status: 204, description: 'Workflow deleted successfully' })
  async deleteWorkflow(@Param('id') workflowId: string) {
    await this.automationService.deleteWorkflow(workflowId);
  }
}
