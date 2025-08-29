import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationWorkflow, WorkflowStatus, WorkflowType } from '../entities/automation-workflow.entity';
import { AutomationTrigger, TriggerType } from '../entities/automation-trigger.entity';
import { AutomationAction, ActionType } from '../entities/automation-action.entity';
import { EmailCampaign } from '../entities/email-campaign.entity';
import { UserSegment } from '../entities/user-segment.entity';

@Injectable()
export class AutomationService {
  constructor(
    @InjectRepository(AutomationWorkflow)
    private workflowRepository: Repository<AutomationWorkflow>,
    @InjectRepository(AutomationTrigger)
    private triggerRepository: Repository<AutomationTrigger>,
    @InjectRepository(AutomationAction)
    private actionRepository: Repository<AutomationAction>,
    @InjectRepository(EmailCampaign)
    private campaignRepository: Repository<EmailCampaign>,
    @InjectRepository(UserSegment)
    private segmentRepository: Repository<UserSegment>,
  ) {}

  async createWorkflow(workflowData: {
    name: string;
    description?: string;
    workflowType: WorkflowType;
    goalType?: string;
    goalValue?: number;
    settings?: Record<string, any>;
    createdBy?: string;
  }): Promise<AutomationWorkflow> {
    const workflow = this.workflowRepository.create({
      ...workflowData,
      status: WorkflowStatus.DRAFT,
    });

    return this.workflowRepository.save(workflow);
  }

  async addTrigger(workflowId: string, triggerData: {
    triggerType: TriggerType;
    eventName: string;
    conditions?: Record<string, any>;
    filters?: Record<string, any>;
    delay?: number;
    delayUnit?: string;
  }): Promise<AutomationTrigger> {
    const workflow = await this.findWorkflow(workflowId);
    
    const trigger = this.triggerRepository.create({
      ...triggerData,
      workflowId,
      isActive: true,
    });

    return this.triggerRepository.save(trigger);
  }

  async addAction(workflowId: string, actionData: {
    actionType: ActionType;
    sortOrder: number;
    configuration: Record<string, any>;
    conditions?: Record<string, any>;
    delay?: number;
    delayUnit?: string;
  }): Promise<AutomationAction> {
    const workflow = await this.findWorkflow(workflowId);
    
    const action = this.actionRepository.create({
      ...actionData,
      workflowId,
      isActive: true,
    });

    return this.actionRepository.save(action);
  }

  async activateWorkflow(workflowId: string): Promise<AutomationWorkflow> {
    const workflow = await this.findWorkflow(workflowId);
    
    // Validate workflow has at least one trigger and one action
    const triggers = await this.triggerRepository.find({ where: { workflowId } });
    const actions = await this.actionRepository.find({ where: { workflowId } });
    
    if (triggers.length === 0) {
      throw new BadRequestException('Workflow must have at least one trigger');
    }
    
    if (actions.length === 0) {
      throw new BadRequestException('Workflow must have at least one action');
    }

    workflow.status = WorkflowStatus.ACTIVE;
    workflow.activatedAt = new Date();
    
    return this.workflowRepository.save(workflow);
  }

  async pauseWorkflow(workflowId: string): Promise<AutomationWorkflow> {
    const workflow = await this.findWorkflow(workflowId);
    
    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Only active workflows can be paused');
    }

    workflow.status = WorkflowStatus.PAUSED;
    return this.workflowRepository.save(workflow);
  }

  async resumeWorkflow(workflowId: string): Promise<AutomationWorkflow> {
    const workflow = await this.findWorkflow(workflowId);
    
    if (workflow.status !== WorkflowStatus.PAUSED) {
      throw new BadRequestException('Only paused workflows can be resumed');
    }

    workflow.status = WorkflowStatus.ACTIVE;
    return this.workflowRepository.save(workflow);
  }

  async processEvent(eventName: string, eventData: Record<string, any>): Promise<void> {
    // Find all active triggers for this event
    const triggers = await this.triggerRepository.find({
      where: { 
        eventName, 
        isActive: true,
      },
      relations: ['workflow'],
    });

    for (const trigger of triggers) {
      if (trigger.workflow.status !== WorkflowStatus.ACTIVE) {
        continue;
      }

      // Check if event matches trigger conditions
      if (this.matchesConditions(eventData, trigger.conditions)) {
        await this.executeTrigger(trigger, eventData);
      }
    }
  }

  async executeTrigger(trigger: AutomationTrigger, eventData: Record<string, any>): Promise<void> {
    // Get workflow actions
    const actions = await this.actionRepository.find({
      where: { workflowId: trigger.workflowId, isActive: true },
      order: { sortOrder: 'ASC' },
    });

    // Execute actions in sequence
    for (const action of actions) {
      try {
        await this.executeAction(action, eventData, trigger);
        
        // Update action stats
        action.executionCount += 1;
        action.lastExecutedAt = new Date();
        await this.actionRepository.save(action);
      } catch (error) {
        // Log error and continue with next action
        console.error(`Error executing action ${action.id}:`, error);
        
        action.errorCount += 1;
        action.lastErrorAt = new Date();
        action.lastErrorMessage = error.message;
        await this.actionRepository.save(action);
      }
    }

    // Update trigger stats
    trigger.executionCount += 1;
    trigger.lastExecutedAt = new Date();
    await this.triggerRepository.save(trigger);

    // Update workflow stats
    const workflow = await this.findWorkflow(trigger.workflowId);
    workflow.executionCount += 1;
    workflow.lastExecutedAt = new Date();
    await this.workflowRepository.save(workflow);
  }

  private async executeAction(
    action: AutomationAction, 
    eventData: Record<string, any>,
    trigger: AutomationTrigger
  ): Promise<void> {
    // Check action conditions
    if (action.conditions && !this.matchesConditions(eventData, action.conditions)) {
      return;
    }

    // Apply delay if specified
    if (action.delay && action.delay > 0) {
      // In production, you'd queue this for later execution
      console.log(`Action ${action.id} delayed by ${action.delay} ${action.delayUnit}`);
    }

    switch (action.actionType) {
      case ActionType.SEND_EMAIL:
        await this.executeSendEmailAction(action, eventData);
        break;
      
      case ActionType.ADD_TO_SEGMENT:
        await this.executeAddToSegmentAction(action, eventData);
        break;
      
      case ActionType.REMOVE_FROM_SEGMENT:
        await this.executeRemoveFromSegmentAction(action, eventData);
        break;
      
      case ActionType.UPDATE_USER_PROPERTIES:
        await this.executeUpdateUserPropertiesAction(action, eventData);
        break;
      
      case ActionType.TRIGGER_WEBHOOK:
        await this.executeTriggerWebhookAction(action, eventData);
        break;
      
      case ActionType.WAIT:
        await this.executeWaitAction(action, eventData);
        break;
      
      case ActionType.CONDITIONAL_SPLIT:
        await this.executeConditionalSplitAction(action, eventData);
        break;
      
      default:
        console.warn(`Unknown action type: ${action.actionType}`);
    }
  }

  private async executeSendEmailAction(action: AutomationAction, eventData: Record<string, any>): Promise<void> {
    const config = action.configuration;
    
    // Create and send campaign
    const campaignData = {
      name: `Automated: ${config.templateName || 'Email'}`,
      campaignType: 'automation' as any,
      templateId: config.templateId,
      subject: config.subject || 'Automated Email',
      senderName: config.senderName,
      senderEmail: config.senderEmail,
      personalizationData: { ...eventData, ...config.personalizationData },
    };

    // This would integrate with your campaign service
    console.log('Sending automated email:', campaignData);
  }

  private async executeAddToSegmentAction(action: AutomationAction, eventData: Record<string, any>): Promise<void> {
    const config = action.configuration;
    const userId = eventData.userId || eventData.user?.id;
    
    if (!userId || !config.segmentId) {
      throw new Error('Missing userId or segmentId for add to segment action');
    }

    // This would integrate with your user/segment management system
    console.log(`Adding user ${userId} to segment ${config.segmentId}`);
  }

  private async executeRemoveFromSegmentAction(action: AutomationAction, eventData: Record<string, any>): Promise<void> {
    const config = action.configuration;
    const userId = eventData.userId || eventData.user?.id;
    
    if (!userId || !config.segmentId) {
      throw new Error('Missing userId or segmentId for remove from segment action');
    }

    // This would integrate with your user/segment management system
    console.log(`Removing user ${userId} from segment ${config.segmentId}`);
  }

  private async executeUpdateUserPropertiesAction(action: AutomationAction, eventData: Record<string, any>): Promise<void> {
    const config = action.configuration;
    const userId = eventData.userId || eventData.user?.id;
    
    if (!userId || !config.properties) {
      throw new Error('Missing userId or properties for update user properties action');
    }

    // This would integrate with your user management system
    console.log(`Updating user ${userId} properties:`, config.properties);
  }

  private async executeTriggerWebhookAction(action: AutomationAction, eventData: Record<string, any>): Promise<void> {
    const config = action.configuration;
    
    if (!config.webhookUrl) {
      throw new Error('Missing webhookUrl for webhook action');
    }

    const payload = {
      ...eventData,
      ...config.payload,
      timestamp: new Date().toISOString(),
      actionId: action.id,
    };

    // This would make an actual HTTP request
    console.log(`Triggering webhook ${config.webhookUrl} with payload:`, payload);
  }

  private async executeWaitAction(action: AutomationAction, eventData: Record<string, any>): Promise<void> {
    const config = action.configuration;
    const waitTime = config.waitTime || 0;
    const waitUnit = config.waitUnit || 'minutes';
    
    console.log(`Waiting ${waitTime} ${waitUnit}`);
    // In production, this would schedule the next action for later
  }

  private async executeConditionalSplitAction(action: AutomationAction, eventData: Record<string, any>): Promise<void> {
    const config = action.configuration;
    const conditions = config.conditions || [];
    
    for (const condition of conditions) {
      if (this.matchesConditions(eventData, condition.criteria)) {
        // Execute actions for this branch
        console.log(`Condition matched, executing branch: ${condition.name}`);
        break;
      }
    }
  }

  private matchesConditions(data: Record<string, any>, conditions: Record<string, any>): boolean {
    if (!conditions) return true;
    
    for (const [key, condition] of Object.entries(conditions)) {
      const value = this.getNestedValue(data, key);
      
      if (!this.evaluateCondition(value, condition)) {
        return false;
      }
    }
    
    return true;
  }

  private evaluateCondition(value: any, condition: any): boolean {
    if (typeof condition === 'object' && condition !== null) {
      const operator = condition.operator || 'equals';
      const expectedValue = condition.value;
      
      switch (operator) {
        case 'equals':
          return value === expectedValue;
        case 'not_equals':
          return value !== expectedValue;
        case 'greater_than':
          return Number(value) > Number(expectedValue);
        case 'less_than':
          return Number(value) < Number(expectedValue);
        case 'contains':
          return String(value).includes(String(expectedValue));
        case 'starts_with':
          return String(value).startsWith(String(expectedValue));
        case 'ends_with':
          return String(value).endsWith(String(expectedValue));
        case 'in':
          return Array.isArray(expectedValue) && expectedValue.includes(value);
        case 'not_in':
          return Array.isArray(expectedValue) && !expectedValue.includes(value);
        default:
          return value === expectedValue;
      }
    }
    
    return value === condition;
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  async findWorkflow(id: string): Promise<AutomationWorkflow> {
    const workflow = await this.workflowRepository.findOne({
      where: { id },
      relations: ['triggers', 'actions'],
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    return workflow;
  }

  async getWorkflowStats(workflowId: string): Promise<{
    executionCount: number;
    successRate: number;
    averageExecutionTime: number;
    lastExecutedAt: Date;
    triggerStats: Array<{
      triggerId: string;
      executionCount: number;
      lastExecutedAt: Date;
    }>;
    actionStats: Array<{
      actionId: string;
      executionCount: number;
      errorCount: number;
      successRate: number;
      lastExecutedAt: Date;
    }>;
  }> {
    const workflow = await this.findWorkflow(workflowId);
    
    const triggerStats = workflow.triggers.map(trigger => ({
      triggerId: trigger.id,
      executionCount: trigger.executionCount,
      lastExecutedAt: trigger.lastExecutedAt,
    }));

    const actionStats = workflow.actions.map(action => ({
      actionId: action.id,
      executionCount: action.executionCount,
      errorCount: action.errorCount,
      successRate: action.executionCount > 0 
        ? ((action.executionCount - action.errorCount) / action.executionCount) * 100 
        : 0,
      lastExecutedAt: action.lastExecutedAt,
    }));

    return {
      executionCount: workflow.executionCount,
      successRate: 95, // This would be calculated from actual execution data
      averageExecutionTime: 1500, // This would be calculated from actual execution data
      lastExecutedAt: workflow.lastExecutedAt,
      triggerStats,
      actionStats,
    };
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    const workflow = await this.findWorkflow(workflowId);
    
    if (workflow.status === WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active workflow. Pause it first.');
    }

    // Delete triggers and actions
    await this.triggerRepository.delete({ workflowId });
    await this.actionRepository.delete({ workflowId });
    
    // Delete workflow
    await this.workflowRepository.delete(workflowId);
  }
}
