import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';
import { WalletPass, PassStatus, PassType } from '../entities/wallet-pass.entity';
import { PassTemplate } from '../entities/pass-template.entity';
import { PassAnalytics, AnalyticsEventType } from '../entities/pass-analytics.entity';
import { PassUpdate, UpdateType, UpdateStatus } from '../entities/pass-update.entity';

export interface ApplePassData {
  formatVersion: number;
  passTypeIdentifier: string;
  serialNumber: string;
  teamIdentifier: string;
  organizationName: string;
  description: string;
  logoText?: string;
  foregroundColor?: string;
  backgroundColor?: string;
  labelColor?: string;
  webServiceURL?: string;
  authenticationToken?: string;
  associatedStoreIdentifiers?: number[];
  locations?: Array<{
    latitude: number;
    longitude: number;
    altitude?: number;
    relevantText?: string;
  }>;
  beacons?: Array<{
    proximityUUID: string;
    major?: number;
    minor?: number;
    relevantText?: string;
  }>;
  relevantDate?: string;
  expirationDate?: string;
  voided?: boolean;
  barcode?: {
    message: string;
    format: string;
    messageEncoding: string;
    altText?: string;
  };
  barcodes?: Array<{
    message: string;
    format: string;
    messageEncoding: string;
    altText?: string;
  }>;
  eventTicket?: {
    headerFields?: any[];
    primaryFields?: any[];
    secondaryFields?: any[];
    auxiliaryFields?: any[];
    backFields?: any[];
  };
  userInfo?: any;
}

@Injectable()
export class ApplePassKitService {
  private readonly logger = new Logger(ApplePassKitService.name);
  private readonly passTypeIdentifier: string;
  private readonly teamIdentifier: string;
  private readonly webServiceURL: string;
  private readonly certificatePath: string;
  private readonly keyPath: string;
  private readonly wwdrCertPath: string;
  private readonly passPhrase: string;

  constructor(
    @InjectRepository(WalletPass)
    private passRepository: Repository<WalletPass>,
    @InjectRepository(PassTemplate)
    private templateRepository: Repository<PassTemplate>,
    @InjectRepository(PassAnalytics)
    private analyticsRepository: Repository<PassAnalytics>,
    @InjectRepository(PassUpdate)
    private updateRepository: Repository<PassUpdate>,
    private configService: ConfigService,
  ) {
    this.passTypeIdentifier = this.configService.get<string>('APPLE_PASS_TYPE_IDENTIFIER');
    this.teamIdentifier = this.configService.get<string>('APPLE_TEAM_IDENTIFIER');
    this.webServiceURL = this.configService.get<string>('APPLE_WEB_SERVICE_URL');
    this.certificatePath = this.configService.get<string>('APPLE_PASS_CERTIFICATE_PATH');
    this.keyPath = this.configService.get<string>('APPLE_PASS_KEY_PATH');
    this.wwdrCertPath = this.configService.get<string>('APPLE_WWDR_CERTIFICATE_PATH');
    this.passPhrase = this.configService.get<string>('APPLE_PASS_KEY_PASSPHRASE');
  }

  /**
   * Generate Apple Wallet pass for a ticket
   */
  async generatePass(
    passId: string,
    templateId?: string,
    customData?: Partial<ApplePassData>
  ): Promise<{
    success: boolean;
    passBuffer?: Buffer;
    downloadUrl?: string;
    error?: string;
  }> {
    this.logger.log(`Generating Apple Wallet pass for ${passId}`);

    try {
      const walletPass = await this.passRepository.findOne({
        where: { id: passId },
        relations: ['user', 'event', 'ticket'],
      });

      if (!walletPass) {
        throw new Error('Wallet pass not found');
      }

      const template = templateId 
        ? await this.templateRepository.findOne({ where: { id: templateId } })
        : await this.getDefaultTemplate(walletPass.event.organizerId);

      if (!template) {
        throw new Error('Pass template not found');
      }

      // Generate pass data
      const passData = await this.buildPassData(walletPass, template, customData);
      
      // Create pass package
      const passBuffer = await this.createPassPackage(passData, walletPass.id);

      // Update pass status
      await this.passRepository.update(passId, {
        status: PassStatus.GENERATED,
        passData: JSON.stringify(passData),
        lastUpdated: new Date(),
      });

      // Track analytics
      await this.trackAnalytics(passId, AnalyticsEventType.PASS_CREATED);

      return {
        success: true,
        passBuffer,
        downloadUrl: `/api/mobile-wallet/passes/${passId}/download`,
      };
    } catch (error) {
      this.logger.error(`Failed to generate Apple Wallet pass: ${error.message}`);
      
      await this.passRepository.update(passId, {
        status: PassStatus.ERROR,
        metadata: { error: error.message },
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update existing Apple Wallet pass
   */
  async updatePass(
    passId: string,
    updateData: Partial<ApplePassData>,
    updateType: UpdateType = UpdateType.FIELD_UPDATE
  ): Promise<{
    success: boolean;
    updatedFields?: string[];
    error?: string;
  }> {
    this.logger.log(`Updating Apple Wallet pass ${passId}`);

    try {
      const walletPass = await this.passRepository.findOne({
        where: { id: passId },
        relations: ['user', 'event', 'ticket'],
      });

      if (!walletPass) {
        throw new Error('Wallet pass not found');
      }

      // Create update record
      const passUpdate = await this.updateRepository.save({
        walletPassId: passId,
        updateType,
        status: UpdateStatus.PROCESSING,
        updateData: { fieldChanges: updateData },
        metadata: {
          triggeredBy: 'system',
          updateSource: 'automatic',
        },
      });

      // Get current pass data
      const currentPassData: ApplePassData = walletPass.passData 
        ? JSON.parse(walletPass.passData)
        : {};

      // Merge updates
      const updatedPassData = { ...currentPassData, ...updateData };

      // Regenerate pass
      const passBuffer = await this.createPassPackage(updatedPassData, passId);

      // Update database
      await this.passRepository.update(passId, {
        passData: JSON.stringify(updatedPassData),
        lastUpdated: new Date(),
      });

      // Update pass update record
      await this.updateRepository.update(passUpdate.id, {
        status: UpdateStatus.COMPLETED,
        processedAt: new Date(),
        processingResult: {
          success: true,
          updatedFields: Object.keys(updateData),
        },
      });

      // Send push notification to devices
      await this.sendPassUpdateNotification(passId);

      // Track analytics
      await this.trackAnalytics(passId, AnalyticsEventType.PASS_UPDATED);

      return {
        success: true,
        updatedFields: Object.keys(updateData),
      };
    } catch (error) {
      this.logger.error(`Failed to update Apple Wallet pass: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle Apple Wallet web service requests
   */
  async handleWebServiceRequest(
    method: string,
    path: string,
    headers: any,
    body?: any
  ): Promise<{
    statusCode: number;
    data?: any;
    headers?: any;
  }> {
    this.logger.log(`Handling Apple Wallet web service request: ${method} ${path}`);

    try {
      // Parse path components
      const pathParts = path.split('/').filter(p => p);
      
      if (pathParts.length < 2) {
        return { statusCode: 400 };
      }

      const version = pathParts[0]; // v1
      const deviceLibraryIdentifier = pathParts[1];
      const passTypeIdentifier = pathParts[2];
      const serialNumber = pathParts[3];

      switch (method) {
        case 'POST':
          // Register device for pass updates
          return await this.registerDevice(
            deviceLibraryIdentifier,
            passTypeIdentifier,
            serialNumber,
            headers.authorization,
            body
          );

        case 'GET':
          if (pathParts.length === 3) {
            // Get updatable passes
            return await this.getUpdatablePasses(
              deviceLibraryIdentifier,
              passTypeIdentifier,
              headers.authorization,
              headers['if-modified-since']
            );
          } else if (pathParts.length === 4) {
            // Get latest version of pass
            return await this.getLatestPass(
              passTypeIdentifier,
              serialNumber,
              headers.authorization,
              headers['if-modified-since']
            );
          }
          break;

        case 'DELETE':
          // Unregister device
          return await this.unregisterDevice(
            deviceLibraryIdentifier,
            passTypeIdentifier,
            serialNumber,
            headers.authorization
          );

        case 'POST_LOG':
          // Log messages from device
          return await this.logMessages(body);
      }

      return { statusCode: 404 };
    } catch (error) {
      this.logger.error(`Web service request failed: ${error.message}`);
      return { statusCode: 500 };
    }
  }

  /**
   * Revoke a pass
   */
  async revokePass(passId: string, reason?: string): Promise<boolean> {
    try {
      await this.passRepository.update(passId, {
        status: PassStatus.REVOKED,
        metadata: { revokeReason: reason, revokedAt: new Date() },
      });

      // Send update to mark pass as voided
      await this.updatePass(passId, { voided: true }, UpdateType.STATUS_CHANGE);

      await this.trackAnalytics(passId, AnalyticsEventType.PASS_DELETED);
      return true;
    } catch (error) {
      this.logger.error(`Failed to revoke pass: ${error.message}`);
      return false;
    }
  }

  // Private helper methods

  private async buildPassData(
    walletPass: WalletPass,
    template: PassTemplate,
    customData?: Partial<ApplePassData>
  ): Promise<ApplePassData> {
    const { user, event, ticket } = walletPass;

    // Build field data with template variables
    const fieldData = {
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      eventName: event.name,
      eventDate: event.startDate?.toLocaleDateString(),
      eventTime: event.startDate?.toLocaleTimeString(),
      venue: event.venue,
      ticketType: ticket.type,
      seatNumber: ticket.seatNumber,
      section: ticket.section,
      row: ticket.row,
      price: ticket.price?.toString(),
      ticketId: ticket.id,
      qrCode: walletPass.qrCodeData || ticket.qrCode,
    };

    // Process field templates
    const processedFields = this.processFieldTemplates(template.fieldTemplates, fieldData);

    const passData: ApplePassData = {
      formatVersion: 1,
      passTypeIdentifier: template.passTypeIdentifier,
      serialNumber: walletPass.serialNumber,
      teamIdentifier: template.teamIdentifier,
      organizationName: template.organizationName || event.organizerName,
      description: `${event.name} - Event Ticket`,
      logoText: template.appearance.logoText,
      foregroundColor: template.appearance.foregroundColor,
      backgroundColor: template.appearance.backgroundColor,
      labelColor: template.appearance.labelColor,
      webServiceURL: this.webServiceURL,
      authenticationToken: walletPass.authenticationToken,
      locations: walletPass.locations || template.locationSettings?.defaultLocations,
      beacons: walletPass.beacons || template.beaconSettings?.beacons,
      relevantDate: event.startDate?.toISOString(),
      expirationDate: walletPass.expiresAt?.toISOString(),
      barcode: {
        message: walletPass.barcodeMessage || walletPass.qrCodeData,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
        altText: `Ticket: ${ticket.id}`,
      },
      eventTicket: {
        headerFields: processedFields.headerFields,
        primaryFields: processedFields.primaryFields,
        secondaryFields: processedFields.secondaryFields,
        auxiliaryFields: processedFields.auxiliaryFields,
        backFields: processedFields.backFields,
      },
      userInfo: walletPass.userInfo,
      ...customData,
    };

    return passData;
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

  private async createPassPackage(passData: ApplePassData, passId: string): Promise<Buffer> {
    const tempDir = path.join(__dirname, '../../../temp', passId);
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      // Write pass.json
      const passJsonPath = path.join(tempDir, 'pass.json');
      fs.writeFileSync(passJsonPath, JSON.stringify(passData, null, 2));

      // Copy images (if they exist)
      await this.copyPassImages(tempDir, passData);

      // Generate manifest
      const manifest = await this.generateManifest(tempDir);
      const manifestPath = path.join(tempDir, 'manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Sign manifest
      const signature = await this.signManifest(manifest);
      const signaturePath = path.join(tempDir, 'signature');
      fs.writeFileSync(signaturePath, signature);

      // Create ZIP archive
      const passBuffer = await this.createZipArchive(tempDir);

      // Cleanup temp directory
      this.cleanupTempDirectory(tempDir);

      return passBuffer;
    } catch (error) {
      this.cleanupTempDirectory(tempDir);
      throw error;
    }
  }

  private async copyPassImages(tempDir: string, passData: ApplePassData): Promise<void> {
    const imageTypes = ['icon', 'logo', 'background', 'footer', 'strip', 'thumbnail'];
    
    for (const imageType of imageTypes) {
      const imagePath = this.getImagePath(imageType, passData);
      if (imagePath && fs.existsSync(imagePath)) {
        const destPath = path.join(tempDir, `${imageType}.png`);
        fs.copyFileSync(imagePath, destPath);

        // Copy @2x version if exists
        const retinaPath = imagePath.replace('.png', '@2x.png');
        if (fs.existsSync(retinaPath)) {
          const retinaDestPath = path.join(tempDir, `${imageType}@2x.png`);
          fs.copyFileSync(retinaPath, retinaDestPath);
        }
      }
    }
  }

  private getImagePath(imageType: string, passData: ApplePassData): string | null {
    // Implementation would return the actual image path based on configuration
    const imagesDir = this.configService.get<string>('PASS_IMAGES_DIR');
    return path.join(imagesDir, `${imageType}.png`);
  }

  private async generateManifest(tempDir: string): Promise<Record<string, string>> {
    const manifest: Record<string, string> = {};
    const files = fs.readdirSync(tempDir);

    for (const file of files) {
      if (file !== 'manifest.json' && file !== 'signature') {
        const filePath = path.join(tempDir, file);
        const fileContent = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha1').update(fileContent).digest('hex');
        manifest[file] = hash;
      }
    }

    return manifest;
  }

  private async signManifest(manifest: Record<string, string>): Promise<Buffer> {
    const manifestJson = JSON.stringify(manifest);
    
    // Load certificates and key
    const cert = fs.readFileSync(this.certificatePath);
    const key = fs.readFileSync(this.keyPath);
    const wwdrCert = fs.readFileSync(this.wwdrCertPath);

    // Create PKCS#7 signature
    const sign = crypto.createSign('sha1');
    sign.update(manifestJson);
    
    return sign.sign({
      key: key,
      passphrase: this.passPhrase,
    });
  }

  private async createZipArchive(tempDir: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      archive.directory(tempDir, false);
      archive.finalize();
    });
  }

  private cleanupTempDirectory(tempDir: string): void {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup temp directory: ${error.message}`);
    }
  }

  private async getDefaultTemplate(organizerId: string): Promise<PassTemplate | null> {
    return await this.templateRepository.findOne({
      where: {
        organizerId,
        passType: PassType.APPLE_WALLET,
        isDefault: true,
      },
    });
  }

  private async trackAnalytics(passId: string, eventType: AnalyticsEventType): Promise<void> {
    try {
      await this.analyticsRepository.save({
        walletPassId: passId,
        eventType,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.warn(`Failed to track analytics: ${error.message}`);
    }
  }

  private async sendPassUpdateNotification(passId: string): Promise<void> {
    // Implementation would send push notification to registered devices
    this.logger.log(`Sending pass update notification for ${passId}`);
  }

  // Web service methods

  private async registerDevice(
    deviceLibraryIdentifier: string,
    passTypeIdentifier: string,
    serialNumber: string,
    authToken: string,
    body: any
  ): Promise<{ statusCode: number; data?: any }> {
    // Implementation for device registration
    return { statusCode: 201 };
  }

  private async getUpdatablePasses(
    deviceLibraryIdentifier: string,
    passTypeIdentifier: string,
    authToken: string,
    ifModifiedSince?: string
  ): Promise<{ statusCode: number; data?: any }> {
    // Implementation for getting updatable passes
    return { statusCode: 200, data: { serialNumbers: [], lastUpdated: new Date().toISOString() } };
  }

  private async getLatestPass(
    passTypeIdentifier: string,
    serialNumber: string,
    authToken: string,
    ifModifiedSince?: string
  ): Promise<{ statusCode: number; data?: any; headers?: any }> {
    // Implementation for getting latest pass
    return { statusCode: 200 };
  }

  private async unregisterDevice(
    deviceLibraryIdentifier: string,
    passTypeIdentifier: string,
    serialNumber: string,
    authToken: string
  ): Promise<{ statusCode: number }> {
    // Implementation for device unregistration
    return { statusCode: 200 };
  }

  private async logMessages(messages: any[]): Promise<{ statusCode: number }> {
    // Implementation for logging device messages
    this.logger.log(`Received ${messages?.length || 0} log messages from device`);
    return { statusCode: 200 };
  }
}
