import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { TemplateService } from '../template.service';
import { EmailTemplate, TemplateStatus, TemplateType } from '../../entities/email-template.entity';
import { TemplateComponent, ComponentType } from '../../entities/template-component.entity';

describe('TemplateService', () => {
  let service: TemplateService;
  let templateRepository: jest.Mocked<Repository<EmailTemplate>>;
  let componentRepository: jest.Mocked<Repository<TemplateComponent>>;

  const mockTemplate = {
    id: '1',
    name: 'Test Template',
    slug: 'test-template',
    templateType: TemplateType.PROMOTIONAL,
    subject: 'Test Subject',
    htmlContent: '<html><body>Test</body></html>',
    status: TemplateStatus.ACTIVE,
    isActive: true,
    usageCount: 5,
    averageRating: 4.5,
    ratingCount: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockComponent = {
    id: '1',
    templateId: '1',
    componentType: ComponentType.TEXT,
    name: 'Text Component',
    properties: { text: 'Hello World' },
    sortOrder: 0,
    isVisible: true,
  };

  beforeEach(async () => {
    const mockTemplateRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      increment: jest.fn(),
      update: jest.fn(),
    };

    const mockComponentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        {
          provide: getRepositoryToken(EmailTemplate),
          useValue: mockTemplateRepository,
        },
        {
          provide: getRepositoryToken(TemplateComponent),
          useValue: mockComponentRepository,
        },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
    templateRepository = module.get(getRepositoryToken(EmailTemplate));
    componentRepository = module.get(getRepositoryToken(TemplateComponent));
  });

  describe('create', () => {
    it('should create a new template with unique slug', async () => {
      const createDto = {
        name: 'New Template',
        templateType: TemplateType.PROMOTIONAL,
        subject: 'New Subject',
        designData: { layout: { width: 600 } },
      };

      templateRepository.findOne.mockResolvedValue(null); // No existing slug
      templateRepository.create.mockReturnValue(mockTemplate as any);
      templateRepository.save.mockResolvedValue(mockTemplate as any);
      templateRepository.findOne.mockResolvedValueOnce(mockTemplate as any); // For findOne call

      const result = await service.create(createDto as any);

      expect(templateRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createDto.name,
          templateType: createDto.templateType,
          subject: createDto.subject,
          slug: 'new-template',
          status: TemplateStatus.DRAFT,
        })
      );
      expect(result).toEqual(mockTemplate);
    });

    it('should generate unique slug when duplicate exists', async () => {
      const createDto = {
        name: 'Test Template',
        templateType: TemplateType.PROMOTIONAL,
        subject: 'Test Subject',
        designData: { layout: { width: 600 } },
      };

      templateRepository.findOne
        .mockResolvedValueOnce(mockTemplate as any) // First slug exists
        .mockResolvedValueOnce(null) // Second slug doesn't exist
        .mockResolvedValueOnce(mockTemplate as any); // For findOne call

      templateRepository.create.mockReturnValue(mockTemplate as any);
      templateRepository.save.mockResolvedValue(mockTemplate as any);

      await service.create(createDto as any);

      expect(templateRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'test-template-1',
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return template when found', async () => {
      templateRepository.findOne.mockResolvedValue(mockTemplate as any);

      const result = await service.findOne('1');

      expect(result).toEqual(mockTemplate);
      expect(templateRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['creator', 'components', 'campaigns'],
        order: {
          components: {
            sortOrder: 'ASC',
          },
        },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      templateRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update template status', async () => {
      templateRepository.findOne.mockResolvedValue(mockTemplate as any);
      templateRepository.save.mockResolvedValue({
        ...mockTemplate,
        status: TemplateStatus.ARCHIVED,
      } as any);

      const result = await service.updateStatus('1', TemplateStatus.ARCHIVED);

      expect(result.status).toBe(TemplateStatus.ARCHIVED);
      expect(templateRepository.save).toHaveBeenCalled();
    });
  });

  describe('incrementUsage', () => {
    it('should increment usage count', async () => {
      await service.incrementUsage('1');

      expect(templateRepository.increment).toHaveBeenCalledWith(
        { id: '1' },
        'usageCount',
        1
      );
    });
  });

  describe('updateRating', () => {
    it('should update average rating correctly', async () => {
      templateRepository.findOne.mockResolvedValue(mockTemplate as any);

      await service.updateRating('1', 5);

      const expectedNewAverage = (4.5 * 10 + 5) / 11; // (current avg * count + new rating) / new count
      expect(templateRepository.update).toHaveBeenCalledWith('1', {
        averageRating: Math.round(expectedNewAverage * 100) / 100,
        ratingCount: 11,
      });
    });
  });

  describe('generatePreview', () => {
    it('should generate preview with variable substitution', async () => {
      const templateWithVariables = {
        ...mockTemplate,
        htmlContent: '<html><body>Hello {{name}}, welcome to {{eventName}}!</body></html>',
        textContent: 'Hello {{name}}, welcome to {{eventName}}!',
        subject: 'Welcome {{name}}!',
        variables: [
          { name: 'name', type: 'text', defaultValue: 'Guest' },
          { name: 'eventName', type: 'text', defaultValue: 'Our Event' },
        ],
      };

      templateRepository.findOne.mockResolvedValue(templateWithVariables as any);

      const result = await service.generatePreview('1', { name: 'John', eventName: 'Tech Conference' });

      expect(result.html).toContain('Hello John, welcome to Tech Conference!');
      expect(result.text).toContain('Hello John, welcome to Tech Conference!');
      expect(result.subject).toContain('Welcome John!');
    });

    it('should use default values for missing variables', async () => {
      const templateWithVariables = {
        ...mockTemplate,
        htmlContent: '<html><body>Hello {{name}}!</body></html>',
        subject: 'Welcome {{name}}!',
        variables: [
          { name: 'name', type: 'text', defaultValue: 'Guest' },
        ],
      };

      templateRepository.findOne.mockResolvedValue(templateWithVariables as any);

      const result = await service.generatePreview('1', {}); // No variables provided

      expect(result.html).toContain('Hello Guest!');
      expect(result.subject).toContain('Welcome Guest!');
    });
  });

  describe('searchTemplates', () => {
    it('should search templates with filters', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockTemplate]),
      };

      templateRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.searchTemplates('test', {
        templateType: TemplateType.PROMOTIONAL,
        category: 'marketing',
        tags: ['event', 'promotion'],
      });

      expect(result).toEqual([mockTemplate]);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(template.name LIKE :search OR template.description LIKE :search OR template.subject LIKE :search)',
        { search: '%test%' }
      );
    });
  });

  describe('duplicate', () => {
    it('should duplicate template with new name', async () => {
      templateRepository.findOne
        .mockResolvedValueOnce({ ...mockTemplate, components: [mockComponent] } as any) // Original template
        .mockResolvedValueOnce(null) // Slug check
        .mockResolvedValueOnce({ ...mockTemplate, id: '2', name: 'Duplicated Template' } as any); // New template

      templateRepository.create.mockReturnValue({ ...mockTemplate, id: '2' } as any);
      templateRepository.save.mockResolvedValue({ ...mockTemplate, id: '2' } as any);
      componentRepository.save.mockResolvedValue([mockComponent] as any);

      const result = await service.duplicate('1', 'Duplicated Template');

      expect(templateRepository.create).toHaveBeenCalled();
      expect(componentRepository.save).toHaveBeenCalled();
    });
  });
});
