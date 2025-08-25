import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PassTemplate, TemplateStatus } from '../entities/pass-template.entity';
import { WalletPass, PassType } from '../entities/wallet-pass.entity';

export interface CreateTemplateDto {
  name: string;
  description?: string;
  organizerId: string;
  passType: PassType;
  passStyle: string;
  passTypeIdentifier: string;
  teamIdentifier: string;
  organizationName?: string;
  appearance: any;
  fieldTemplates: any;
  barcodeSettings?: any;
  locationSettings?: any;
  beaconSettings?: any;
  notificationSettings?: any;
  sharingSettings?: any;
  webServiceSettings?: any;
  associatedApps?: any;
  customization?: any;
  validation?: any;
  isDefault?: boolean;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  status?: TemplateStatus;
  appearance?: any;
  fieldTemplates?: any;
  barcodeSettings?: any;
  locationSettings?: any;
  beaconSettings?: any;
  notificationSettings?: any;
  sharingSettings?: any;
  webServiceSettings?: any;
  associatedApps?: any;
  customization?: any;
  validation?: any;
  isDefault?: boolean;
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class PassTemplateService {
  private readonly logger = new Logger(PassTemplateService.name);

  constructor(
    @InjectRepository(PassTemplate)
    private templateRepository: Repository<PassTemplate>,
    @InjectRepository(WalletPass)
    private passRepository: Repository<WalletPass>,
  ) {}

  /**
   * Create a new pass template
   */
  async createTemplate(createDto: CreateTemplateDto): Promise<PassTemplate> {
    this.logger.log(`Creating new pass template: ${createDto.name}`);

    // Validate template data
    const validation = await this.validateTemplate(createDto);
    if (!validation.isValid) {
      throw new BadRequestException(`Template validation failed: ${validation.errors.join(', ')}`);
    }

    // If this is set as default, unset other defaults for the same organizer and pass type
    if (createDto.isDefault) {
      await this.unsetDefaultTemplates(createDto.organizerId, createDto.passType);
    }

    const template = this.templateRepository.create({
      ...createDto,
      status: TemplateStatus.DRAFT,
    });

    return await this.templateRepository.save(template);
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<PassTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['organizer'],
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  /**
   * Get templates for an organizer
   */
  async getTemplatesByOrganizer(
    organizerId: string,
    passType?: PassType,
    status?: TemplateStatus
  ): Promise<PassTemplate[]> {
    const queryBuilder = this.templateRepository.createQueryBuilder('template')
      .where('template.organizerId = :organizerId', { organizerId });

    if (passType) {
      queryBuilder.andWhere('template.passType = :passType', { passType });
    }

    if (status) {
      queryBuilder.andWhere('template.status = :status', { status });
    }

    queryBuilder.orderBy('template.isDefault', 'DESC')
      .addOrderBy('template.createdAt', 'DESC');

    return await queryBuilder.getMany();
  }

  /**
   * Get default template for organizer and pass type
   */
  async getDefaultTemplate(organizerId: string, passType: PassType): Promise<PassTemplate | null> {
    return await this.templateRepository.findOne({
      where: {
        organizerId,
        passType,
        isDefault: true,
        status: TemplateStatus.ACTIVE,
      },
    });
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, updateDto: UpdateTemplateDto): Promise<PassTemplate> {
    this.logger.log(`Updating template: ${id}`);

    const template = await this.getTemplate(id);

    // If setting as default, unset other defaults
    if (updateDto.isDefault && !template.isDefault) {
      await this.unsetDefaultTemplates(template.organizerId, template.passType);
    }

    // Validate updated template
    const updatedData = { ...template, ...updateDto };
    const validation = await this.validateTemplate(updatedData);
    if (!validation.isValid) {
      throw new BadRequestException(`Template validation failed: ${validation.errors.join(', ')}`);
    }

    Object.assign(template, updateDto);
    return await this.templateRepository.save(template);
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<void> {
    this.logger.log(`Deleting template: ${id}`);

    const template = await this.getTemplate(id);

    // Check if template is being used by any passes
    const passCount = await this.passRepository.count({
      where: { templateId: id },
    });

    if (passCount > 0) {
      throw new BadRequestException(`Cannot delete template: ${passCount} passes are using this template`);
    }

    await this.templateRepository.remove(template);
  }

  /**
   * Clone template
   */
  async cloneTemplate(id: string, newName: string, organizerId?: string): Promise<PassTemplate> {
    this.logger.log(`Cloning template: ${id}`);

    const originalTemplate = await this.getTemplate(id);

    const clonedTemplate = this.templateRepository.create({
      ...originalTemplate,
      id: undefined, // Let TypeORM generate new ID
      name: newName,
      organizerId: organizerId || originalTemplate.organizerId,
      status: TemplateStatus.DRAFT,
      isDefault: false,
      createdAt: undefined,
      updatedAt: undefined,
    });

    return await this.templateRepository.save(clonedTemplate);
  }

  /**
   * Activate template
   */
  async activateTemplate(id: string): Promise<PassTemplate> {
    this.logger.log(`Activating template: ${id}`);

    const template = await this.getTemplate(id);

    // Validate template before activation
    const validation = await this.validateTemplate(template);
    if (!validation.isValid) {
      throw new BadRequestException(`Cannot activate template: ${validation.errors.join(', ')}`);
    }

    template.status = TemplateStatus.ACTIVE;
    return await this.templateRepository.save(template);
  }

  /**
   * Deactivate template
   */
  async deactivateTemplate(id: string): Promise<PassTemplate> {
    this.logger.log(`Deactivating template: ${id}`);

    const template = await this.getTemplate(id);
    template.status = TemplateStatus.INACTIVE;
    return await this.templateRepository.save(template);
  }

  /**
   * Archive template
   */
  async archiveTemplate(id: string): Promise<PassTemplate> {
    this.logger.log(`Archiving template: ${id}`);

    const template = await this.getTemplate(id);
    template.status = TemplateStatus.ARCHIVED;
    return await this.templateRepository.save(template);
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsage(id: string): Promise<{
    totalPasses: number;
    activePasses: number;
    passesLast30Days: number;
    passStatusBreakdown: Record<string, number>;
  }> {
    const template = await this.getTemplate(id);

    const totalPasses = await this.passRepository.count({
      where: { templateId: id },
    });

    const activePasses = await this.passRepository.count({
      where: { templateId: id, status: 'ACTIVE' },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const passesLast30Days = await this.passRepository.count({
      where: {
        templateId: id,
        createdAt: { $gte: thirtyDaysAgo } as any,
      },
    });

    // Get pass status breakdown
    const statusBreakdown = await this.passRepository
      .createQueryBuilder('pass')
      .select('pass.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('pass.templateId = :templateId', { templateId: id })
      .groupBy('pass.status')
      .getRawMany();

    const passStatusBreakdown = statusBreakdown.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {});

    return {
      totalPasses,
      activePasses,
      passesLast30Days,
      passStatusBreakdown,
    };
  }

  /**
   * Validate template configuration
   */
  async validateTemplate(template: Partial<PassTemplate>): Promise<TemplateValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!template.name?.trim()) {
      errors.push('Template name is required');
    }

    if (!template.passTypeIdentifier?.trim()) {
      errors.push('Pass type identifier is required');
    }

    if (!template.teamIdentifier?.trim()) {
      errors.push('Team identifier is required');
    }

    if (!template.appearance) {
      errors.push('Appearance configuration is required');
    } else {
      // Validate appearance
      if (!template.appearance.backgroundColor) {
        errors.push('Background color is required');
      }
      if (!template.appearance.foregroundColor) {
        errors.push('Foreground color is required');
      }
      if (!template.appearance.labelColor) {
        errors.push('Label color is required');
      }
    }

    if (!template.fieldTemplates) {
      errors.push('Field templates are required');
    } else {
      // Validate field templates
      const { fieldTemplates } = template;
      
      if (!fieldTemplates.primaryFields?.length) {
        warnings.push('No primary fields defined - pass may look empty');
      }

      // Check for duplicate field keys
      const allFields = [
        ...(fieldTemplates.headerFields || []),
        ...(fieldTemplates.primaryFields || []),
        ...(fieldTemplates.secondaryFields || []),
        ...(fieldTemplates.auxiliaryFields || []),
        ...(fieldTemplates.backFields || []),
      ];

      const fieldKeys = allFields.map(f => f.key);
      const duplicateKeys = fieldKeys.filter((key, index) => fieldKeys.indexOf(key) !== index);
      
      if (duplicateKeys.length > 0) {
        errors.push(`Duplicate field keys found: ${duplicateKeys.join(', ')}`);
      }

      // Validate field templates
      allFields.forEach((field, index) => {
        if (!field.key?.trim()) {
          errors.push(`Field at index ${index} is missing key`);
        }
        if (!field.label?.trim()) {
          errors.push(`Field '${field.key}' is missing label`);
        }
        if (!field.valueTemplate?.trim()) {
          errors.push(`Field '${field.key}' is missing value template`);
        }
      });
    }

    // Validate barcode settings
    if (template.barcodeSettings) {
      if (!template.barcodeSettings.messageTemplate?.trim()) {
        errors.push('Barcode message template is required when barcode is enabled');
      }
    }

    // Validate location settings
    if (template.locationSettings?.enabled) {
      if (!template.locationSettings.defaultLocations?.length && !template.locationSettings.useEventLocation) {
        warnings.push('Location notifications enabled but no default locations specified');
      }
    }

    // Validate beacon settings
    if (template.beaconSettings?.enabled) {
      if (!template.beaconSettings.beacons?.length) {
        warnings.push('Beacon notifications enabled but no beacons specified');
      } else {
        template.beaconSettings.beacons.forEach((beacon, index) => {
          if (!beacon.proximityUUID?.trim()) {
            errors.push(`Beacon at index ${index} is missing proximity UUID`);
          }
        });
      }
    }

    // Validate customization limits
    if (template.customization) {
      const maxFields = template.customization.maxCustomFields || 0;
      if (maxFields < 0 || maxFields > 20) {
        warnings.push('Maximum custom fields should be between 0 and 20');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Preview template with sample data
   */
  async previewTemplate(id: string, sampleData?: any): Promise<any> {
    const template = await this.getTemplate(id);

    const defaultSampleData = {
      userName: 'John Doe',
      userEmail: 'john.doe@example.com',
      eventName: 'Sample Event',
      eventDate: new Date().toLocaleDateString(),
      eventTime: '7:00 PM',
      venue: 'Sample Venue',
      ticketType: 'General Admission',
      seatNumber: 'A1',
      section: 'Section A',
      row: 'Row 1',
      price: '$50.00',
      ticketId: 'SAMPLE-123',
      qrCode: 'SAMPLE-QR-CODE',
    };

    const data = { ...defaultSampleData, ...sampleData };

    // Process field templates with sample data
    const processedFields = this.processFieldTemplates(template.fieldTemplates, data);

    return {
      template: {
        id: template.id,
        name: template.name,
        passType: template.passType,
        passStyle: template.passStyle,
        appearance: template.appearance,
      },
      processedFields,
      sampleData: data,
    };
  }

  /**
   * Export template configuration
   */
  async exportTemplate(id: string): Promise<any> {
    const template = await this.getTemplate(id);

    return {
      name: template.name,
      description: template.description,
      passType: template.passType,
      passStyle: template.passStyle,
      passTypeIdentifier: template.passTypeIdentifier,
      teamIdentifier: template.teamIdentifier,
      organizationName: template.organizationName,
      appearance: template.appearance,
      fieldTemplates: template.fieldTemplates,
      barcodeSettings: template.barcodeSettings,
      locationSettings: template.locationSettings,
      beaconSettings: template.beaconSettings,
      notificationSettings: template.notificationSettings,
      sharingSettings: template.sharingSettings,
      webServiceSettings: template.webServiceSettings,
      associatedApps: template.associatedApps,
      customization: template.customization,
      validation: template.validation,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
  }

  /**
   * Import template configuration
   */
  async importTemplate(
    organizerId: string,
    templateData: any,
    name?: string
  ): Promise<PassTemplate> {
    this.logger.log(`Importing template for organizer: ${organizerId}`);

    const createDto: CreateTemplateDto = {
      name: name || templateData.name || 'Imported Template',
      description: templateData.description,
      organizerId,
      passType: templateData.passType,
      passStyle: templateData.passStyle,
      passTypeIdentifier: templateData.passTypeIdentifier,
      teamIdentifier: templateData.teamIdentifier,
      organizationName: templateData.organizationName,
      appearance: templateData.appearance,
      fieldTemplates: templateData.fieldTemplates,
      barcodeSettings: templateData.barcodeSettings,
      locationSettings: templateData.locationSettings,
      beaconSettings: templateData.beaconSettings,
      notificationSettings: templateData.notificationSettings,
      sharingSettings: templateData.sharingSettings,
      webServiceSettings: templateData.webServiceSettings,
      associatedApps: templateData.associatedApps,
      customization: templateData.customization,
      validation: templateData.validation,
      isDefault: false,
    };

    return await this.createTemplate(createDto);
  }

  // Private helper methods

  private async unsetDefaultTemplates(organizerId: string, passType: PassType): Promise<void> {
    await this.templateRepository.update(
      { organizerId, passType, isDefault: true },
      { isDefault: false }
    );
  }

  private processFieldTemplates(templates: any, data: any): any {
    const processField = (field: any) => ({
      key: field.key,
      label: field.label,
      value: this.replaceTemplateVariables(field.valueTemplate, data),
      textAlignment: field.textAlignment || 'PKTextAlignmentLeft',
    });

    return {
      headerFields: templates.headerFields?.map(processField) || [],
      primaryFields: templates.primaryFields?.map(processField) || [],
      secondaryFields: templates.secondaryFields?.map(processField) || [],
      auxiliaryFields: templates.auxiliaryFields?.map(processField) || [],
      backFields: templates.backFields?.map(processField) || [],
    };
  }

  private replaceTemplateVariables(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }
}
