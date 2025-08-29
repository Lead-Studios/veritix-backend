import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { TemplateBuilderService, TemplateLayout, DragDropComponent } from '../template-builder.service';
import { EmailTemplate } from '../../entities/email-template.entity';
import { TemplateComponent, ComponentType } from '../../entities/template-component.entity';

describe('TemplateBuilderService', () => {
  let service: TemplateBuilderService;
  let templateRepository: jest.Mocked<Repository<EmailTemplate>>;
  let componentRepository: jest.Mocked<Repository<TemplateComponent>>;

  const mockTemplate = {
    id: '1',
    name: 'Test Template',
    designData: {
      layout: {
        width: 600,
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        globalStyles: {},
      },
      components: [],
    },
    components: [],
  };

  const mockComponent = {
    id: '1',
    templateId: '1',
    componentType: ComponentType.TEXT,
    name: 'Text Component',
    properties: {
      text: 'Hello World',
      position: { x: 10, y: 20, width: 200, height: 50 },
      style: { fontSize: 16, color: '#333333' },
    },
    isVisible: true,
    sortOrder: 0,
  };

  const mockLayout: TemplateLayout = {
    width: 600,
    backgroundColor: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    globalStyles: {},
    components: [
      {
        id: '1',
        type: ComponentType.TEXT,
        properties: { text: 'Hello World' },
        position: { x: 10, y: 20, width: 200, height: 50 },
        style: { fontSize: 16, color: '#333333' },
        isVisible: true,
      },
    ],
  };

  beforeEach(async () => {
    const mockTemplateRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockComponentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateBuilderService,
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

    service = module.get<TemplateBuilderService>(TemplateBuilderService);
    templateRepository = module.get(getRepositoryToken(EmailTemplate));
    componentRepository = module.get(getRepositoryToken(TemplateComponent));
  });

  describe('saveTemplateLayout', () => {
    it('should save template layout and generate HTML', async () => {
      templateRepository.findOne.mockResolvedValue(mockTemplate as any);
      componentRepository.delete.mockResolvedValue({ affected: 1 } as any);
      componentRepository.create.mockReturnValue(mockComponent as any);
      componentRepository.save.mockResolvedValue([mockComponent] as any);
      templateRepository.save.mockResolvedValue({
        ...mockTemplate,
        htmlContent: expect.any(String),
      } as any);

      const result = await service.saveTemplateLayout('1', mockLayout);

      expect(templateRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(componentRepository.delete).toHaveBeenCalledWith({ templateId: '1' });
      expect(componentRepository.save).toHaveBeenCalled();
      expect(templateRepository.save).toHaveBeenCalled();
      expect(result.htmlContent).toContain('Hello World');
    });

    it('should throw BadRequestException when template not found', async () => {
      templateRepository.findOne.mockResolvedValue(null);

      await expect(service.saveTemplateLayout('999', mockLayout))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getTemplateLayout', () => {
    it('should return template layout', async () => {
      templateRepository.findOne.mockResolvedValue({
        ...mockTemplate,
        components: [mockComponent],
      } as any);

      const result = await service.getTemplateLayout('1');

      expect(result).toEqual({
        width: 600,
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        globalStyles: {},
        components: [{
          id: '1',
          type: ComponentType.TEXT,
          properties: mockComponent.properties,
          position: mockComponent.properties.position,
          style: mockComponent.properties.style,
          conditions: mockComponent.conditions,
          isVisible: mockComponent.isVisible,
        }],
      });
    });

    it('should throw BadRequestException when template not found', async () => {
      templateRepository.findOne.mockResolvedValue(null);

      await expect(service.getTemplateLayout('999'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('addComponent', () => {
    it('should add component to template', async () => {
      const componentData: Omit<DragDropComponent, 'id'> = {
        type: ComponentType.BUTTON,
        properties: { buttonText: 'Click Me', buttonUrl: '#' },
        position: { x: 50, y: 100, width: 150, height: 40 },
        style: { backgroundColor: '#007bff', color: '#ffffff' },
        isVisible: true,
      };

      templateRepository.findOne.mockResolvedValue(mockTemplate as any);
      componentRepository.create.mockReturnValue({
        ...mockComponent,
        componentType: ComponentType.BUTTON,
      } as any);
      componentRepository.save.mockResolvedValue({
        ...mockComponent,
        componentType: ComponentType.BUTTON,
      } as any);

      const result = await service.addComponent('1', componentData);

      expect(componentRepository.create).toHaveBeenCalledWith({
        templateId: '1',
        componentType: ComponentType.BUTTON,
        name: 'BUTTON Component',
        properties: {
          ...componentData.properties,
          position: componentData.position,
          style: componentData.style,
        },
        conditions: componentData.conditions,
        isVisible: true,
        sortOrder: 0,
      });
      expect(result.componentType).toBe(ComponentType.BUTTON);
    });
  });

  describe('updateComponent', () => {
    it('should update component properties', async () => {
      const updates: Partial<DragDropComponent> = {
        properties: { text: 'Updated Text' },
        style: { fontSize: 18 },
        position: { x: 20, y: 30, width: 250, height: 60 },
      };

      componentRepository.findOne.mockResolvedValue(mockComponent as any);
      componentRepository.save.mockResolvedValue({
        ...mockComponent,
        properties: {
          ...mockComponent.properties,
          ...updates.properties,
          style: { ...mockComponent.properties.style, ...updates.style },
          position: updates.position,
        },
      } as any);

      const result = await service.updateComponent('1', updates);

      expect(componentRepository.save).toHaveBeenCalledWith({
        ...mockComponent,
        properties: {
          ...mockComponent.properties,
          ...updates.properties,
          style: { ...mockComponent.properties.style, ...updates.style },
          position: updates.position,
        },
      });
    });

    it('should throw BadRequestException when component not found', async () => {
      componentRepository.findOne.mockResolvedValue(null);

      await expect(service.updateComponent('999', {}))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteComponent', () => {
    it('should delete component', async () => {
      componentRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.deleteComponent('1');

      expect(componentRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw BadRequestException when component not found', async () => {
      componentRepository.delete.mockResolvedValue({ affected: 0 } as any);

      await expect(service.deleteComponent('999'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('duplicateComponent', () => {
    it('should duplicate component with offset position', async () => {
      componentRepository.findOne.mockResolvedValue(mockComponent as any);
      componentRepository.create.mockReturnValue({
        ...mockComponent,
        id: '2',
        name: 'Text Component (Copy)',
      } as any);
      componentRepository.save.mockResolvedValue({
        ...mockComponent,
        id: '2',
        name: 'Text Component (Copy)',
      } as any);

      const result = await service.duplicateComponent('1');

      expect(componentRepository.create).toHaveBeenCalledWith({
        templateId: '1',
        componentType: ComponentType.TEXT,
        name: 'Text Component (Copy)',
        properties: {
          ...mockComponent.properties,
          position: {
            ...mockComponent.properties.position,
            x: mockComponent.properties.position.x + 20,
            y: mockComponent.properties.position.y + 20,
          },
        },
        conditions: mockComponent.conditions,
        isVisible: mockComponent.isVisible,
        sortOrder: mockComponent.sortOrder + 1,
      });
    });
  });

  describe('getComponentLibrary', () => {
    it('should return component library', async () => {
      const result = await service.getComponentLibrary();

      expect(result).toHaveLength(3); // Basic, Layout, Social categories
      expect(result[0].category).toBe('Basic');
      expect(result[0].components).toHaveLength(4); // Text, Heading, Image, Button
      expect(result[1].category).toBe('Layout');
      expect(result[2].category).toBe('Social');

      // Check basic components
      const textComponent = result[0].components.find(c => c.type === ComponentType.TEXT);
      expect(textComponent).toEqual({
        type: ComponentType.TEXT,
        name: 'Text Block',
        description: 'Simple text content',
        defaultProperties: { text: 'Your text here...' },
        defaultStyle: { fontSize: 16, color: '#333333' },
      });
    });
  });

  describe('HTML generation', () => {
    it('should generate HTML for text component', () => {
      const component: DragDropComponent = {
        id: '1',
        type: ComponentType.TEXT,
        properties: { text: 'Hello World' },
        position: { x: 10, y: 20, width: 200, height: 50 },
        style: { fontSize: 16, color: '#333333' },
        isVisible: true,
      };

      const html = (service as any).generateComponentHtml(component);

      expect(html).toContain('Hello World');
      expect(html).toContain('position: absolute');
      expect(html).toContain('left: 10px');
      expect(html).toContain('top: 20px');
      expect(html).toContain('width: 200px');
      expect(html).toContain('height: 50px');
      expect(html).toContain('font-size: 16');
      expect(html).toContain('color: #333333');
    });

    it('should generate HTML for button component', () => {
      const component: DragDropComponent = {
        id: '1',
        type: ComponentType.BUTTON,
        properties: { 
          buttonText: 'Click Me', 
          buttonUrl: 'https://example.com',
          buttonColor: '#007bff',
          buttonTextColor: '#ffffff',
        },
        position: { x: 50, y: 100, width: 150, height: 40 },
        style: {},
        isVisible: true,
      };

      const html = (service as any).generateComponentHtml(component);

      expect(html).toContain('Click Me');
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('background-color: #007bff');
      expect(html).toContain('color: #ffffff');
    });

    it('should generate HTML for image component', () => {
      const component: DragDropComponent = {
        id: '1',
        type: ComponentType.IMAGE,
        properties: { 
          src: 'https://example.com/image.jpg',
          alt: 'Test Image',
        },
        position: { x: 0, y: 0, width: 300, height: 200 },
        style: {},
        isVisible: true,
      };

      const html = (service as any).generateComponentHtml(component);

      expect(html).toContain('src="https://example.com/image.jpg"');
      expect(html).toContain('alt="Test Image"');
      expect(html).toContain('<img');
    });
  });

  describe('CSS generation', () => {
    it('should generate inline styles correctly', () => {
      const styles = {
        fontSize: 16,
        color: '#333333',
        backgroundColor: '#ffffff',
        textAlign: 'center',
      };

      const result = (service as any).generateInlineStyles(styles);

      expect(result).toBe('font-size: 16; color: #333333; background-color: #ffffff; text-align: center');
    });

    it('should filter out undefined and null values', () => {
      const styles = {
        fontSize: 16,
        color: undefined,
        backgroundColor: null,
        textAlign: 'center',
      };

      const result = (service as any).generateInlineStyles(styles);

      expect(result).toBe('font-size: 16; text-align: center');
    });
  });
});
