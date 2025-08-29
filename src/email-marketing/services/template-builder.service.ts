import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from '../entities/email-template.entity';
import { TemplateComponent, ComponentType } from '../entities/template-component.entity';

export interface DragDropComponent {
  id: string;
  type: ComponentType;
  properties: Record<string, any>;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style: {
    backgroundColor?: string;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    textAlign?: 'left' | 'center' | 'right';
    padding?: string;
    margin?: string;
    border?: string;
    borderRadius?: string;
  };
  conditions?: Record<string, any>;
  isVisible?: boolean;
}

export interface TemplateLayout {
  width: number;
  backgroundColor: string;
  fontFamily: string;
  components: DragDropComponent[];
  globalStyles: Record<string, any>;
}

@Injectable()
export class TemplateBuilderService {
  constructor(
    @InjectRepository(EmailTemplate)
    private templateRepository: Repository<EmailTemplate>,
    @InjectRepository(TemplateComponent)
    private componentRepository: Repository<TemplateComponent>,
  ) {}

  async saveTemplateLayout(templateId: string, layout: TemplateLayout): Promise<EmailTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    // Update template design data
    template.designData = {
      layout: {
        width: layout.width,
        backgroundColor: layout.backgroundColor,
        fontFamily: layout.fontFamily,
        globalStyles: layout.globalStyles,
      },
      components: layout.components,
    };

    // Generate HTML from layout
    template.htmlContent = this.generateHtmlFromLayout(layout);

    // Remove existing components
    await this.componentRepository.delete({ templateId });

    // Create new components
    const components = layout.components.map((comp, index) =>
      this.componentRepository.create({
        templateId,
        componentType: comp.type,
        name: `Component ${index + 1}`,
        properties: {
          ...comp.properties,
          position: comp.position,
          style: comp.style,
        },
        conditions: comp.conditions,
        isVisible: comp.isVisible !== false,
        sortOrder: index,
      })
    );

    await this.componentRepository.save(components);

    return this.templateRepository.save(template);
  }

  async getTemplateLayout(templateId: string): Promise<TemplateLayout> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
      relations: ['components'],
    });

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    const designData = template.designData || {};
    const layout = designData.layout || {};

    return {
      width: layout.width || 600,
      backgroundColor: layout.backgroundColor || '#ffffff',
      fontFamily: layout.fontFamily || 'Arial, sans-serif',
      globalStyles: layout.globalStyles || {},
      components: template.components?.map(comp => ({
        id: comp.id,
        type: comp.componentType,
        properties: comp.properties || {},
        position: comp.properties?.position || { x: 0, y: 0, width: 100, height: 50 },
        style: comp.properties?.style || {},
        conditions: comp.conditions,
        isVisible: comp.isVisible,
      })) || [],
    };
  }

  async addComponent(templateId: string, component: Omit<DragDropComponent, 'id'>): Promise<TemplateComponent> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    const newComponent = this.componentRepository.create({
      templateId,
      componentType: component.type,
      name: `${component.type} Component`,
      properties: {
        ...component.properties,
        position: component.position,
        style: component.style,
      },
      conditions: component.conditions,
      isVisible: component.isVisible !== false,
      sortOrder: 0, // Will be updated when saving layout
    });

    return this.componentRepository.save(newComponent);
  }

  async updateComponent(componentId: string, updates: Partial<DragDropComponent>): Promise<TemplateComponent> {
    const component = await this.componentRepository.findOne({
      where: { id: componentId },
    });

    if (!component) {
      throw new BadRequestException('Component not found');
    }

    if (updates.properties) {
      component.properties = { ...component.properties, ...updates.properties };
    }

    if (updates.position) {
      component.properties = { 
        ...component.properties, 
        position: updates.position 
      };
    }

    if (updates.style) {
      component.properties = { 
        ...component.properties, 
        style: { ...component.properties?.style, ...updates.style }
      };
    }

    if (updates.conditions !== undefined) {
      component.conditions = updates.conditions;
    }

    if (updates.isVisible !== undefined) {
      component.isVisible = updates.isVisible;
    }

    return this.componentRepository.save(component);
  }

  async deleteComponent(componentId: string): Promise<void> {
    const result = await this.componentRepository.delete(componentId);
    if (result.affected === 0) {
      throw new BadRequestException('Component not found');
    }
  }

  async duplicateComponent(componentId: string): Promise<TemplateComponent> {
    const originalComponent = await this.componentRepository.findOne({
      where: { id: componentId },
    });

    if (!originalComponent) {
      throw new BadRequestException('Component not found');
    }

    const duplicatedComponent = this.componentRepository.create({
      templateId: originalComponent.templateId,
      componentType: originalComponent.componentType,
      name: `${originalComponent.name} (Copy)`,
      properties: {
        ...originalComponent.properties,
        position: {
          ...originalComponent.properties?.position,
          x: (originalComponent.properties?.position?.x || 0) + 20,
          y: (originalComponent.properties?.position?.y || 0) + 20,
        },
      },
      conditions: originalComponent.conditions,
      isVisible: originalComponent.isVisible,
      sortOrder: originalComponent.sortOrder + 1,
    });

    return this.componentRepository.save(duplicatedComponent);
  }

  private generateHtmlFromLayout(layout: TemplateLayout): string {
    const { width, backgroundColor, fontFamily, components, globalStyles } = layout;

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Template</title>
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            font-family: ${fontFamily}; 
            background-color: #f4f4f4;
          }
          .email-container { 
            width: ${width}px; 
            margin: 0 auto; 
            background-color: ${backgroundColor}; 
            position: relative;
          }
          .component {
            position: absolute;
          }
          ${this.generateGlobalStyles(globalStyles)}
        </style>
      </head>
      <body>
        <div class="email-container">
    `;

    // Sort components by z-index or creation order
    const sortedComponents = [...components].sort((a, b) => 
      (a.position.y || 0) - (b.position.y || 0)
    );

    for (const component of sortedComponents) {
      if (component.isVisible !== false) {
        html += this.generateComponentHtml(component);
      }
    }

    html += `
        </div>
      </body>
      </html>
    `;

    return html;
  }

  private generateComponentHtml(component: DragDropComponent): string {
    const { position, style, properties, type } = component;
    
    const inlineStyles = this.generateInlineStyles({
      ...style,
      position: 'absolute',
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: `${position.width}px`,
      height: `${position.height}px`,
    });

    switch (type) {
      case ComponentType.TEXT:
        return `<div class="component" style="${inlineStyles}">${properties.text || 'Sample Text'}</div>`;
      
      case ComponentType.HEADING:
        const headingLevel = properties.level || 1;
        return `<h${headingLevel} class="component" style="${inlineStyles}">${properties.text || 'Heading'}</h${headingLevel}>`;
      
      case ComponentType.IMAGE:
        return `<img class="component" src="${properties.src || 'https://via.placeholder.com/300x200'}" alt="${properties.alt || ''}" style="${inlineStyles}" />`;
      
      case ComponentType.BUTTON:
        const buttonStyles = this.generateInlineStyles({
          ...style,
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${position.width}px`,
          height: `${position.height}px`,
          display: 'inline-block',
          textDecoration: 'none',
          textAlign: 'center',
          lineHeight: `${position.height}px`,
          backgroundColor: properties.buttonColor || '#007bff',
          color: properties.buttonTextColor || '#ffffff',
          borderRadius: properties.borderRadius || '4px',
        });
        return `<a href="${properties.buttonUrl || '#'}" class="component" style="${buttonStyles}">${properties.buttonText || 'Click Here'}</a>`;
      
      case ComponentType.DIVIDER:
        const dividerStyles = this.generateInlineStyles({
          ...style,
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${position.width}px`,
          height: '1px',
          backgroundColor: properties.color || '#cccccc',
          border: 'none',
        });
        return `<hr class="component" style="${dividerStyles}" />`;
      
      case ComponentType.SPACER:
        return `<div class="component" style="${inlineStyles}"></div>`;
      
      case ComponentType.SOCIAL:
        const socialLinks = properties.socialLinks || [];
        let socialHtml = `<div class="component" style="${inlineStyles}">`;
        for (const link of socialLinks) {
          socialHtml += `<a href="${link.url}" style="margin-right: 10px;"><img src="${link.icon}" alt="${link.platform}" width="24" height="24" /></a>`;
        }
        socialHtml += '</div>';
        return socialHtml;
      
      default:
        return `<div class="component" style="${inlineStyles}">Unknown Component</div>`;
    }
  }

  private generateInlineStyles(styles: Record<string, any>): string {
    return Object.entries(styles)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${cssKey}: ${value}`;
      })
      .join('; ');
  }

  private generateGlobalStyles(globalStyles: Record<string, any>): string {
    let css = '';
    
    for (const [selector, styles] of Object.entries(globalStyles)) {
      css += `${selector} { ${this.generateInlineStyles(styles)} }\n`;
    }
    
    return css;
  }

  async getComponentLibrary(): Promise<Array<{
    category: string;
    components: Array<{
      type: ComponentType;
      name: string;
      description: string;
      defaultProperties: Record<string, any>;
      defaultStyle: Record<string, any>;
    }>;
  }>> {
    return [
      {
        category: 'Basic',
        components: [
          {
            type: ComponentType.TEXT,
            name: 'Text Block',
            description: 'Simple text content',
            defaultProperties: { text: 'Your text here...' },
            defaultStyle: { fontSize: 16, color: '#333333' },
          },
          {
            type: ComponentType.HEADING,
            name: 'Heading',
            description: 'Heading text (H1-H6)',
            defaultProperties: { text: 'Your heading here', level: 1 },
            defaultStyle: { fontSize: 24, fontWeight: 'bold', color: '#333333' },
          },
          {
            type: ComponentType.IMAGE,
            name: 'Image',
            description: 'Image with optional link',
            defaultProperties: { src: 'https://via.placeholder.com/300x200', alt: 'Image' },
            defaultStyle: { borderRadius: '4px' },
          },
          {
            type: ComponentType.BUTTON,
            name: 'Button',
            description: 'Call-to-action button',
            defaultProperties: { 
              buttonText: 'Click Here', 
              buttonUrl: '#',
              buttonColor: '#007bff',
              buttonTextColor: '#ffffff',
            },
            defaultStyle: { borderRadius: '4px', padding: '12px 24px' },
          },
        ],
      },
      {
        category: 'Layout',
        components: [
          {
            type: ComponentType.DIVIDER,
            name: 'Divider',
            description: 'Horizontal line separator',
            defaultProperties: { color: '#cccccc' },
            defaultStyle: { height: '1px', backgroundColor: '#cccccc' },
          },
          {
            type: ComponentType.SPACER,
            name: 'Spacer',
            description: 'Empty space for layout',
            defaultProperties: {},
            defaultStyle: { height: '20px' },
          },
        ],
      },
      {
        category: 'Social',
        components: [
          {
            type: ComponentType.SOCIAL,
            name: 'Social Links',
            description: 'Social media icons and links',
            defaultProperties: {
              socialLinks: [
                { platform: 'facebook', url: '#', icon: 'https://via.placeholder.com/24x24' },
                { platform: 'twitter', url: '#', icon: 'https://via.placeholder.com/24x24' },
                { platform: 'instagram', url: '#', icon: 'https://via.placeholder.com/24x24' },
              ],
            },
            defaultStyle: { textAlign: 'center' },
          },
        ],
      },
    ];
  }
}
