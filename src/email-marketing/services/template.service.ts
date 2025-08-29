import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Not } from 'typeorm';
import { EmailTemplate, TemplateStatus, TemplateType } from '../entities/email-template.entity';
import { TemplateComponent, ComponentType } from '../entities/template-component.entity';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { TemplateQueryDto } from '../dto/template-query.dto';

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(EmailTemplate)
    private templateRepository: Repository<EmailTemplate>,
    @InjectRepository(TemplateComponent)
    private componentRepository: Repository<TemplateComponent>,
  ) {}

  async create(createTemplateDto: CreateTemplateDto): Promise<EmailTemplate> {
    // Generate unique slug
    const baseSlug = createTemplateDto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    
    while (await this.templateRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Generate HTML content from design data
    const htmlContent = await this.generateHtmlFromDesign(createTemplateDto.designData);

    const template = this.templateRepository.create({
      name: createTemplateDto.name,
      description: createTemplateDto.description,
      templateType: createTemplateDto.templateType,
      subject: createTemplateDto.subject,
      preheaderText: createTemplateDto.preheaderText,
      textContent: createTemplateDto.textContent,
      designData: createTemplateDto.designData,
      tags: createTemplateDto.tags,
      variables: createTemplateDto.variables,
      createdBy: createTemplateDto.createdBy,
      isSystem: createTemplateDto.isSystem || false,
      slug,
      htmlContent,
      status: TemplateStatus.DRAFT,
    });

    const savedTemplate = await this.templateRepository.save(template);

    // Create components if provided
    if (createTemplateDto.components && createTemplateDto.components.length > 0) {
      const components = createTemplateDto.components.map((comp, index) =>
        this.componentRepository.create({
          ...comp,
          templateId: savedTemplate.id,
          sortOrder: index,
        })
      );
      await this.componentRepository.save(components);
    }

    return this.findOne(savedTemplate.id);
  }

  async findAll(query: TemplateQueryDto): Promise<{
    templates: EmailTemplate[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      templateType,
      category,
      status,
      createdBy,
      search,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.creator', 'creator')
      .leftJoinAndSelect('template.components', 'components');

    // Apply filters
    if (templateType) {
      queryBuilder.andWhere('template.templateType = :templateType', { templateType });
    }

    if (category) {
      queryBuilder.andWhere('template.category = :category', { category });
    }

    if (status) {
      queryBuilder.andWhere('template.status = :status', { status });
    }

    if (createdBy) {
      queryBuilder.andWhere('template.createdBy = :createdBy', { createdBy });
    }

    if (search) {
      queryBuilder.andWhere(
        '(template.name LIKE :search OR template.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('template.tags && :tags', { tags });
    }

    // Apply sorting
    queryBuilder.orderBy(`template.${sortBy}`, sortOrder);

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [templates, total] = await queryBuilder.getManyAndCount();

    return {
      templates,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<EmailTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['creator', 'components', 'campaigns'],
      order: {
        components: {
          sortOrder: 'ASC',
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async findBySlug(slug: string): Promise<EmailTemplate> {
    const template = await this.templateRepository.findOne({
      where: { slug },
      relations: ['creator', 'components'],
      order: {
        components: {
          sortOrder: 'ASC',
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto): Promise<EmailTemplate> {
    const template = await this.findOne(id);

    // Update slug if name changed
    if (updateTemplateDto.name && updateTemplateDto.name !== template.name) {
      const baseSlug = updateTemplateDto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      let slug = baseSlug;
      let counter = 1;
      
      while (await this.templateRepository.findOne({ 
        where: { slug, id: Not(id) } 
      })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      updateTemplateDto.slug = slug;
    }

    // Regenerate HTML if design data changed
    if (updateTemplateDto.designData) {
      updateTemplateDto.htmlContent = await this.generateHtmlFromDesign(updateTemplateDto.designData);
    }

    Object.assign(template, updateTemplateDto);
    const updatedTemplate = await this.templateRepository.save(template);

    // Update components if provided
    if (updateTemplateDto.components) {
      // Remove existing components
      await this.componentRepository.delete({ templateId: id });
      
      // Add new components
      const components = updateTemplateDto.components.map((comp, index) =>
        this.componentRepository.create({
          ...comp,
          templateId: id,
          sortOrder: index,
        })
      );
      await this.componentRepository.save(components);
    }

    return this.findOne(updatedTemplate.id);
  }

  async duplicate(id: string, name: string): Promise<EmailTemplate> {
    const originalTemplate = await this.findOne(id);
    
    const duplicateData = {
      ...originalTemplate,
      name,
      slug: undefined, // Will be generated
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      usageCount: 0,
      averageRating: 0,
      ratingCount: 0,
      status: TemplateStatus.DRAFT,
    };

    const duplicatedTemplate = await this.create(duplicateData as any);

    // Duplicate components
    if (originalTemplate.components && originalTemplate.components.length > 0) {
      const components = originalTemplate.components.map(comp => ({
        ...comp,
        id: undefined,
        templateId: duplicatedTemplate.id,
        createdAt: undefined,
        updatedAt: undefined,
      }));

      await this.componentRepository.save(components as any);
    }

    return this.findOne(duplicatedTemplate.id);
  }

  async updateStatus(id: string, status: TemplateStatus): Promise<EmailTemplate> {
    const template = await this.findOne(id);
    template.status = status;
    return this.templateRepository.save(template);
  }

  async getSystemTemplates(): Promise<EmailTemplate[]> {
    return this.templateRepository.find({
      where: { isSystem: true, isActive: true },
      relations: ['components'],
      order: { templateType: 'ASC', name: 'ASC' },
    });
  }

  async getPopularTemplates(limit: number = 10): Promise<EmailTemplate[]> {
    return this.templateRepository.find({
      where: { isActive: true, status: TemplateStatus.ACTIVE },
      relations: ['creator'],
      order: { usageCount: 'DESC', averageRating: 'DESC' },
      take: limit,
    });
  }

  async getTemplatesByType(templateType: TemplateType): Promise<EmailTemplate[]> {
    return this.templateRepository.find({
      where: { templateType, isActive: true, status: TemplateStatus.ACTIVE },
      relations: ['creator'],
      order: { averageRating: 'DESC', usageCount: 'DESC' },
    });
  }

  async searchTemplates(searchTerm: string, filters: {
    templateType?: TemplateType;
    category?: string;
    tags?: string[];
  } = {}): Promise<EmailTemplate[]> {
    const queryBuilder = this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.creator', 'creator')
      .where('template.isActive = :isActive', { isActive: true })
      .andWhere('template.status = :status', { status: TemplateStatus.ACTIVE });

    if (searchTerm) {
      queryBuilder.andWhere(
        '(template.name LIKE :search OR template.description LIKE :search OR template.subject LIKE :search)',
        { search: `%${searchTerm}%` }
      );
    }

    if (filters.templateType) {
      queryBuilder.andWhere('template.templateType = :templateType', {
        templateType: filters.templateType,
      });
    }

    if (filters.category) {
      queryBuilder.andWhere('template.category = :category', {
        category: filters.category,
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('template.tags && :tags', { tags: filters.tags });
    }

    return queryBuilder
      .orderBy('template.averageRating', 'DESC')
      .addOrderBy('template.usageCount', 'DESC')
      .getMany();
  }

  async incrementUsage(id: string): Promise<void> {
    await this.templateRepository.increment({ id }, 'usageCount', 1);
  }

  async updateRating(id: string, rating: number): Promise<void> {
    const template = await this.findOne(id);
    const newRatingCount = template.ratingCount + 1;
    const newAverageRating = 
      (template.averageRating * template.ratingCount + rating) / newRatingCount;

    await this.templateRepository.update(id, {
      averageRating: Math.round(newAverageRating * 100) / 100,
      ratingCount: newRatingCount,
    });
  }

  async generatePreview(id: string, variables: Record<string, any> = {}): Promise<{
    html: string;
    text: string;
    subject: string;
  }> {
    const template = await this.findOne(id);
    
    // Replace variables in content
    let html = template.htmlContent;
    let text = template.textContent || '';
    let subject = template.subject;

    // Apply variable substitution
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      html = html.replace(regex, String(value));
      text = text.replace(regex, String(value));
      subject = subject.replace(regex, String(value));
    }

    // Apply default values for missing variables
    if (template.variables) {
      for (const variable of template.variables) {
        if (!variables[variable.name] && variable.defaultValue) {
          const regex = new RegExp(`{{\\s*${variable.name}\\s*}}`, 'g');
          html = html.replace(regex, String(variable.defaultValue));
          text = text.replace(regex, String(variable.defaultValue));
          subject = subject.replace(regex, String(variable.defaultValue));
        }
      }
    }

    return { html, text, subject };
  }

  private async generateHtmlFromDesign(designData: any): Promise<string> {
    // This is a simplified version - in production, you'd use a proper template engine
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Template</title>
        <style>
          body { margin: 0; padding: 0; font-family: ${designData.layout?.fontFamily || 'Arial, sans-serif'}; }
          .container { width: ${designData.layout?.width || 600}px; margin: 0 auto; background-color: ${designData.layout?.backgroundColor || '#ffffff'}; }
        </style>
      </head>
      <body>
        <div class="container">
    `;

    // Process components
    if (designData.components) {
      for (const component of designData.components) {
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

  private generateComponentHtml(component: any): string {
    switch (component.componentType) {
      case ComponentType.TEXT:
        return `<div style="padding: 20px; font-size: ${component.properties.fontSize || 16}px; color: ${component.properties.color || '#000000'}; text-align: ${component.properties.textAlign || 'left'};">${component.properties.text || ''}</div>`;
      
      case ComponentType.IMAGE:
        return `<div style="padding: 20px; text-align: center;"><img src="${component.properties.src || ''}" alt="${component.properties.alt || ''}" style="max-width: 100%; height: auto;" /></div>`;
      
      case ComponentType.BUTTON:
        return `<div style="padding: 20px; text-align: center;"><a href="${component.properties.buttonUrl || '#'}" style="display: inline-block; padding: 12px 24px; background-color: ${component.properties.buttonColor || '#007bff'}; color: ${component.properties.buttonTextColor || '#ffffff'}; text-decoration: none; border-radius: 4px;">${component.properties.buttonText || 'Click Here'}</a></div>`;
      
      case ComponentType.DIVIDER:
        return `<div style="padding: 10px 20px;"><hr style="border: none; border-top: 1px solid #cccccc;" /></div>`;
      
      default:
        return `<div style="padding: 20px;">Component: ${component.componentType}</div>`;
    }
  }

  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);
    
    // Soft delete by setting status to archived
    template.status = TemplateStatus.ARCHIVED;
    template.isActive = false;
    await this.templateRepository.save(template);
  }
}
