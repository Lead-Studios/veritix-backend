import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AutomationService } from '../automation.service';
import { AutomationWorkflow, WorkflowStatus, WorkflowType } from '../../entities/automation-workflow.entity';
import { AutomationTrigger, TriggerType } from '../../entities/automation-trigger.entity';
import { AutomationAction, ActionType } from '../../entities/automation-action.entity';
import { EmailCampaign } from '../../entities/email-campaign.entity';
import { UserSegment } from '../../entities/user-segment.entity';

describe('AutomationService', () => {
  let service: AutomationService;
  let workflowRepository: jest.Mocked<Repository<AutomationWorkflow>>;
  let triggerRepository: jest.Mocked<Repository<AutomationTrigger>>;
  let actionRepository: jest.Mocked<Repository<AutomationAction>>;

  const mockWorkflow = {
    id: '1',
    name: 'Test Workflow',
    workflowType: WorkflowType.DRIP_CAMPAIGN,
    status: WorkflowStatus.DRAFT,
    executionCount: 0,
    createdAt: new Date(),
    triggers: [],
    actions: [],
  };

  const mockTrigger = {
    id: '1',
    workflowId: '1',
    triggerType: TriggerType.EVENT,
    eventName: 'user_registered',
    isActive: true,
    executionCount: 0,
  };

  const mockAction = {
    id: '1',
    workflowId: '1',
    actionType: ActionType.SEND_EMAIL,
    sortOrder: 1,
    configuration: { templateId: 'template-1' },
    isActive: true,
    executionCount: 0,
    errorCount: 0,
  };

  beforeEach(async () => {
    const mockWorkflowRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const mockTriggerRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    const mockActionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationService,
        {
          provide: getRepositoryToken(AutomationWorkflow),
          useValue: mockWorkflowRepository,
        },
        {
          provide: getRepositoryToken(AutomationTrigger),
          useValue: mockTriggerRepository,
        },
        {
          provide: getRepositoryToken(AutomationAction),
          useValue: mockActionRepository,
        },
        {
          provide: getRepositoryToken(EmailCampaign),
          useValue: {},
        },
        {
          provide: getRepositoryToken(UserSegment),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AutomationService>(AutomationService);
    workflowRepository = module.get(getRepositoryToken(AutomationWorkflow));
    triggerRepository = module.get(getRepositoryToken(AutomationTrigger));
    actionRepository = module.get(getRepositoryToken(AutomationAction));
  });

  describe('createWorkflow', () => {
    it('should create a new workflow', async () => {
      const workflowData = {
        name: 'New Workflow',
        workflowType: WorkflowType.DRIP_CAMPAIGN,
        description: 'Test workflow',
      };

      workflowRepository.create.mockReturnValue(mockWorkflow as any);
      workflowRepository.save.mockResolvedValue(mockWorkflow as any);

      const result = await service.createWorkflow(workflowData);

      expect(workflowRepository.create).toHaveBeenCalledWith({
        ...workflowData,
        status: WorkflowStatus.DRAFT,
      });
      expect(result).toEqual(mockWorkflow);
    });
  });

  describe('addTrigger', () => {
    it('should add trigger to workflow', async () => {
      const triggerData = {
        triggerType: TriggerType.EVENT,
        eventName: 'user_registered',
        conditions: { userType: 'premium' },
      };

      workflowRepository.findOne.mockResolvedValue(mockWorkflow as any);
      triggerRepository.create.mockReturnValue(mockTrigger as any);
      triggerRepository.save.mockResolvedValue(mockTrigger as any);

      const result = await service.addTrigger('1', triggerData);

      expect(triggerRepository.create).toHaveBeenCalledWith({
        ...triggerData,
        workflowId: '1',
        isActive: true,
      });
      expect(result).toEqual(mockTrigger);
    });
  });

  describe('addAction', () => {
    it('should add action to workflow', async () => {
      const actionData = {
        actionType: ActionType.SEND_EMAIL,
        sortOrder: 1,
        configuration: { templateId: 'template-1' },
      };

      workflowRepository.findOne.mockResolvedValue(mockWorkflow as any);
      actionRepository.create.mockReturnValue(mockAction as any);
      actionRepository.save.mockResolvedValue(mockAction as any);

      const result = await service.addAction('1', actionData);

      expect(actionRepository.create).toHaveBeenCalledWith({
        ...actionData,
        workflowId: '1',
        isActive: true,
      });
      expect(result).toEqual(mockAction);
    });
  });

  describe('activateWorkflow', () => {
    it('should activate workflow with triggers and actions', async () => {
      workflowRepository.findOne.mockResolvedValue(mockWorkflow as any);
      triggerRepository.find.mockResolvedValue([mockTrigger]);
      actionRepository.find.mockResolvedValue([mockAction]);
      workflowRepository.save.mockResolvedValue({
        ...mockWorkflow,
        status: WorkflowStatus.ACTIVE,
      } as any);

      const result = await service.activateWorkflow('1');

      expect(result.status).toBe(WorkflowStatus.ACTIVE);
      expect(workflowRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when no triggers exist', async () => {
      workflowRepository.findOne.mockResolvedValue(mockWorkflow as any);
      triggerRepository.find.mockResolvedValue([]);
      actionRepository.find.mockResolvedValue([mockAction]);

      await expect(service.activateWorkflow('1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no actions exist', async () => {
      workflowRepository.findOne.mockResolvedValue(mockWorkflow as any);
      triggerRepository.find.mockResolvedValue([mockTrigger]);
      actionRepository.find.mockResolvedValue([]);

      await expect(service.activateWorkflow('1'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('processEvent', () => {
    it('should process event and execute matching triggers', async () => {
      const eventData = { userId: '123', userType: 'premium' };
      const activeTrigger = {
        ...mockTrigger,
        workflow: { ...mockWorkflow, status: WorkflowStatus.ACTIVE },
        conditions: { userType: 'premium' },
      };

      triggerRepository.find.mockResolvedValue([activeTrigger] as any);
      actionRepository.find.mockResolvedValue([mockAction] as any);
      triggerRepository.save.mockResolvedValue(mockTrigger as any);
      actionRepository.save.mockResolvedValue(mockAction as any);
      workflowRepository.save.mockResolvedValue(mockWorkflow as any);

      // Mock private methods
      jest.spyOn(service as any, 'matchesConditions').mockReturnValue(true);
      jest.spyOn(service as any, 'executeAction').mockResolvedValue(undefined);

      await service.processEvent('user_registered', eventData);

      expect(triggerRepository.find).toHaveBeenCalledWith({
        where: { 
          eventName: 'user_registered', 
          isActive: true,
        },
        relations: ['workflow'],
      });
    });
  });

  describe('pauseWorkflow', () => {
    it('should pause active workflow', async () => {
      workflowRepository.findOne.mockResolvedValue({
        ...mockWorkflow,
        status: WorkflowStatus.ACTIVE,
      } as any);
      workflowRepository.save.mockResolvedValue({
        ...mockWorkflow,
        status: WorkflowStatus.PAUSED,
      } as any);

      const result = await service.pauseWorkflow('1');

      expect(result.status).toBe(WorkflowStatus.PAUSED);
    });

    it('should throw BadRequestException when workflow is not active', async () => {
      workflowRepository.findOne.mockResolvedValue({
        ...mockWorkflow,
        status: WorkflowStatus.DRAFT,
      } as any);

      await expect(service.pauseWorkflow('1'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getWorkflowStats', () => {
    it('should return workflow statistics', async () => {
      const workflowWithStats = {
        ...mockWorkflow,
        executionCount: 100,
        triggers: [{ ...mockTrigger, executionCount: 50 }],
        actions: [{ ...mockAction, executionCount: 45, errorCount: 5 }],
      };

      workflowRepository.findOne.mockResolvedValue(workflowWithStats as any);

      const result = await service.getWorkflowStats('1');

      expect(result).toEqual({
        executionCount: 100,
        successRate: 95,
        averageExecutionTime: 1500,
        lastExecutedAt: workflowWithStats.lastExecutedAt,
        triggerStats: [{
          triggerId: mockTrigger.id,
          executionCount: 50,
          lastExecutedAt: mockTrigger.lastExecutedAt,
        }],
        actionStats: [{
          actionId: mockAction.id,
          executionCount: 45,
          errorCount: 5,
          successRate: ((45 - 5) / 45) * 100,
          lastExecutedAt: mockAction.lastExecutedAt,
        }],
      });
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete inactive workflow', async () => {
      workflowRepository.findOne.mockResolvedValue({
        ...mockWorkflow,
        status: WorkflowStatus.PAUSED,
      } as any);
      triggerRepository.delete.mockResolvedValue({ affected: 1 } as any);
      actionRepository.delete.mockResolvedValue({ affected: 1 } as any);
      workflowRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.deleteWorkflow('1');

      expect(triggerRepository.delete).toHaveBeenCalledWith({ workflowId: '1' });
      expect(actionRepository.delete).toHaveBeenCalledWith({ workflowId: '1' });
      expect(workflowRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw BadRequestException when workflow is active', async () => {
      workflowRepository.findOne.mockResolvedValue({
        ...mockWorkflow,
        status: WorkflowStatus.ACTIVE,
      } as any);

      await expect(service.deleteWorkflow('1'))
        .rejects.toThrow(BadRequestException);
    });
  });
});
