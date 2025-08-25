import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { JWT } from 'google-auth-library';
import { WalletPass, PassStatus, PassType } from '../entities/wallet-pass.entity';
import { PassTemplate } from '../entities/pass-template.entity';
import { PassAnalytics, AnalyticsEventType } from '../entities/pass-analytics.entity';
import { PassUpdate, UpdateType, UpdateStatus } from '../entities/pass-update.entity';

export interface GooglePayPassData {
  iss: string;
  aud: string;
  typ: string;
  iat: number;
  payload: {
    eventTicketObjects: Array<{
      id: string;
      classId: string;
      state: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'INACTIVE';
      barcode?: {
        type: 'QR_CODE' | 'PDF_417' | 'AZTEC' | 'CODE_128';
        value: string;
        alternateText?: string;
      };
      ticketHolderName?: string;
      ticketNumber?: string;
      eventName?: {
        defaultValue?: {
          language: string;
          value: string;
        };
        localizedValues?: Array<{
          language: string;
          value: string;
        }>;
      };
      dateTime?: {
        start: string;
        end?: string;
      };
      location?: {
        latitude: number;
        longitude: number;
      };
      textModulesData?: Array<{
        id: string;
        header: string;
        body: string;
      }>;
      linksModuleData?: {
        uris?: Array<{
          uri: string;
          description: string;
        }>;
      };
      imageModulesData?: Array<{
        id: string;
        mainImage: {
          sourceUri: {
            uri: string;
          };
          contentDescription: {
            defaultValue: {
              language: string;
              value: string;
            };
          };
        };
      }>;
      notifications?: {
        upcomingNotification?: {
          enableNotification: boolean;
        };
        expiryNotification?: {
          enableNotification: boolean;
        };
      };
      passConstraints?: {
        screenshotEligibility: 'ELIGIBLE' | 'INELIGIBLE';
        nfcConstraint: Array<'BLOCK_PAYMENT' | 'BLOCK_CLOSED_LOOP_TRANSIT'>;
      };
      rotatingBarcode?: {
        type: 'QR_CODE';
        renderEncoding: 'UTF_8';
        valuePattern: string;
        totpDetails: {
          periodMillis: number;
          algorithm: string;
          parameters: Array<{
            key: string;
            value: string;
          }>;
        };
      };
      appLinkData?: {
        androidAppLinkInfo?: {
          appTarget: {
            targetUri: {
              uri: string;
            };
          };
        };
        iosAppLinkInfo?: {
          appTarget: {
            targetUri: {
              uri: string;
            };
          };
        };
        webAppLinkInfo?: {
          appTarget: {
            targetUri: {
              uri: string;
            };
          };
        };
      };
      groupingInfo?: {
        sortIndex?: number;
        groupingId?: string;
      };
      validTimeInterval?: {
        start?: {
          date: string;
        };
        end?: {
          date: string;
        };
      };
      locations?: Array<{
        latitude: number;
        longitude: number;
        altitude?: number;
      }>;
      hasUsers?: boolean;
      smartTapRedemptionValue?: string;
      wideLogo?: {
        sourceUri: {
          uri: string;
        };
        contentDescription: {
          defaultValue: {
            language: string;
            value: string;
          };
        };
      };
      heroImage?: {
        sourceUri: {
          uri: string;
        };
        contentDescription: {
          defaultValue: {
            language: string;
            value: string;
          };
        };
      };
    }>;
  };
}

export interface GooglePayEventTicketClass {
  id: string;
  issuerName: string;
  eventName: {
    defaultValue: {
      language: string;
      value: string;
    };
  };
  logo?: {
    sourceUri: {
      uri: string;
    };
    contentDescription: {
      defaultValue: {
        language: string;
        value: string;
      };
    };
  };
  venue?: {
    name: {
      defaultValue: {
        language: string;
        value: string;
      };
    };
    address: {
      defaultValue: {
        language: string;
        value: string;
      };
    };
  };
  dateTime?: {
    start: string;
    end?: string;
  };
  finePrint?: {
    defaultValue: {
      language: string;
      value: string;
    };
  };
  confirmationCodeLabel?: {
    defaultValue: {
      language: string;
      value: string;
    };
  };
  seatLabel?: {
    defaultValue: {
      language: string;
      value: string;
    };
  };
  rowLabel?: {
    defaultValue: {
      language: string;
      value: string;
    };
  };
  sectionLabel?: {
    defaultValue: {
      language: string;
      value: string;
    };
  };
  gateLabel?: {
    defaultValue: {
      language: string;
      value: string;
    };
  };
  homepageUri?: {
    uri: string;
    description: string;
  };
  locations?: Array<{
    latitude: number;
    longitude: number;
    altitude?: number;
  }>;
  review?: {
    comments?: string;
  };
  reviewStatus?: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DRAFT';
  version?: string;
  viewUnlockRequirement?: 'UNLOCK_NOT_REQUIRED' | 'UNLOCK_REQUIRED_TO_VIEW';
  enableSmartTap?: boolean;
  redemptionIssuers?: Array<string>;
  securityAnimation?: {
    animationType: 'FOIL_SHIMMER';
  };
  multipleDevicesAndHoldersAllowedStatus?: 'ONE_USER_ALL_DEVICES' | 'ONE_USER_ONE_DEVICE' | 'MULTIPLE_HOLDERS';
  callbackOptions?: {
    updateRequestUrl?: string;
    url?: string;
  };
  classTemplateInfo?: {
    cardTemplateOverride?: {
      cardRowTemplateInfos?: Array<{
        twoItems?: {
          startItem?: {
            firstValue?: {
              fields?: Array<{
                fieldPath: string;
              }>;
            };
          };
          endItem?: {
            firstValue?: {
              fields?: Array<{
                fieldPath: string;
              }>;
            };
          };
        };
        threeItems?: {
          startItem?: {
            firstValue?: {
              fields?: Array<{
                fieldPath: string;
              }>;
            };
          };
          middleItem?: {
            firstValue?: {
              fields?: Array<{
                fieldPath: string;
              }>;
            };
          };
          endItem?: {
            firstValue?: {
              fields?: Array<{
                fieldPath: string;
              }>;
            };
          };
        };
      }>;
    };
    detailsTemplateOverride?: {
      detailsItemInfos?: Array<{
        item?: {
          firstValue?: {
            fields?: Array<{
              fieldPath: string;
            }>;
          };
        };
      }>;
    };
    listTemplateOverride?: {
      firstRowOption?: {
        fieldOption?: {
          fields?: Array<{
            fieldPath: string;
          }>;
        };
      };
      secondRowOption?: {
        fieldOption?: {
          fields?: Array<{
            fieldPath: string;
          }>;
        };
      };
      thirdRowOption?: {
        fieldOption?: {
          fields?: Array<{
            fieldPath: string;
          }>;
        };
      };
    };
  };
}

@Injectable()
export class GooglePayService {
  private readonly logger = new Logger(GooglePayService.name);
  private readonly issuerId: string;
  private readonly serviceAccountEmail: string;
  private readonly serviceAccountKey: string;
  private readonly baseUrl = 'https://walletobjects.googleapis.com/walletobjects/v1';
  private jwtClient: JWT;

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
    private httpService: HttpService,
  ) {
    this.issuerId = this.configService.get<string>('GOOGLE_PAY_ISSUER_ID');
    this.serviceAccountEmail = this.configService.get<string>('GOOGLE_PAY_SERVICE_ACCOUNT_EMAIL');
    this.serviceAccountKey = this.configService.get<string>('GOOGLE_PAY_SERVICE_ACCOUNT_KEY');
    
    this.initializeJwtClient();
  }

  private initializeJwtClient(): void {
    this.jwtClient = new JWT({
      email: this.serviceAccountEmail,
      key: this.serviceAccountKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
    });
  }

  /**
   * Generate Google Pay pass for a ticket
   */
  async generatePass(
    passId: string,
    templateId?: string,
    customData?: Partial<GooglePayPassData>
  ): Promise<{
    success: boolean;
    saveUrl?: string;
    passData?: GooglePayPassData;
    error?: string;
  }> {
    this.logger.log(`Generating Google Pay pass for ${passId}`);

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

      // Create or update event ticket class
      const classId = `${this.issuerId}.${walletPass.eventId}`;
      await this.createOrUpdateEventTicketClass(classId, walletPass, template);

      // Create event ticket object
      const objectId = `${this.issuerId}.${walletPass.id}`;
      const passData = await this.buildPassData(objectId, classId, walletPass, template, customData);

      // Create the pass object in Google Pay
      await this.createEventTicketObject(objectId, passData.payload.eventTicketObjects[0]);

      // Generate save URL
      const saveUrl = await this.generateSaveUrl(passData);

      // Update pass status
      await this.passRepository.update(passId, {
        status: PassStatus.GENERATED,
        passData: JSON.stringify(passData),
        passUrl: saveUrl,
        lastUpdated: new Date(),
      });

      // Track analytics
      await this.trackAnalytics(passId, AnalyticsEventType.PASS_CREATED);

      return {
        success: true,
        saveUrl,
        passData,
      };
    } catch (error) {
      this.logger.error(`Failed to generate Google Pay pass: ${error.message}`);
      
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
   * Update existing Google Pay pass
   */
  async updatePass(
    passId: string,
    updateData: any,
    updateType: UpdateType = UpdateType.FIELD_UPDATE
  ): Promise<{
    success: boolean;
    updatedFields?: string[];
    error?: string;
  }> {
    this.logger.log(`Updating Google Pay pass ${passId}`);

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

      const objectId = `${this.issuerId}.${passId}`;

      // Update the pass object in Google Pay
      await this.updateEventTicketObject(objectId, updateData);

      // Update database
      const currentPassData = walletPass.passData ? JSON.parse(walletPass.passData) : {};
      const updatedPassData = { ...currentPassData, ...updateData };

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

      // Track analytics
      await this.trackAnalytics(passId, AnalyticsEventType.PASS_UPDATED);

      return {
        success: true,
        updatedFields: Object.keys(updateData),
      };
    } catch (error) {
      this.logger.error(`Failed to update Google Pay pass: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Revoke a Google Pay pass
   */
  async revokePass(passId: string, reason?: string): Promise<boolean> {
    try {
      const objectId = `${this.issuerId}.${passId}`;
      
      // Update pass state to EXPIRED in Google Pay
      await this.updateEventTicketObject(objectId, { state: 'EXPIRED' });

      await this.passRepository.update(passId, {
        status: PassStatus.REVOKED,
        metadata: { revokeReason: reason, revokedAt: new Date() },
      });

      await this.trackAnalytics(passId, AnalyticsEventType.PASS_DELETED);
      return true;
    } catch (error) {
      this.logger.error(`Failed to revoke Google Pay pass: ${error.message}`);
      return false;
    }
  }

  /**
   * Create or update event ticket class
   */
  private async createOrUpdateEventTicketClass(
    classId: string,
    walletPass: WalletPass,
    template: PassTemplate
  ): Promise<void> {
    const { event } = walletPass;

    const eventTicketClass: GooglePayEventTicketClass = {
      id: classId,
      issuerName: template.organizationName || event.organizerName,
      eventName: {
        defaultValue: {
          language: 'en-US',
          value: event.name,
        },
      },
      venue: {
        name: {
          defaultValue: {
            language: 'en-US',
            value: event.venue || 'Event Venue',
          },
        },
        address: {
          defaultValue: {
            language: 'en-US',
            value: event.address || '',
          },
        },
      },
      dateTime: {
        start: event.startDate?.toISOString(),
        end: event.endDate?.toISOString(),
      },
      locations: walletPass.locations || template.locationSettings?.defaultLocations,
      reviewStatus: 'APPROVED',
      multipleDevicesAndHoldersAllowedStatus: 'ONE_USER_ALL_DEVICES',
      enableSmartTap: true,
    };

    try {
      // Try to get existing class
      await this.getEventTicketClass(classId);
      // If it exists, update it
      await this.updateEventTicketClass(classId, eventTicketClass);
    } catch (error) {
      // If it doesn't exist, create it
      await this.createEventTicketClass(eventTicketClass);
    }
  }

  /**
   * Build Google Pay pass data
   */
  private async buildPassData(
    objectId: string,
    classId: string,
    walletPass: WalletPass,
    template: PassTemplate,
    customData?: Partial<GooglePayPassData>
  ): Promise<GooglePayPassData> {
    const { user, event, ticket } = walletPass;

    const eventTicketObject = {
      id: objectId,
      classId: classId,
      state: 'ACTIVE' as const,
      barcode: {
        type: 'QR_CODE' as const,
        value: walletPass.qrCodeData || ticket.qrCode,
        alternateText: `Ticket: ${ticket.id}`,
      },
      ticketHolderName: `${user.firstName} ${user.lastName}`,
      ticketNumber: ticket.id,
      textModulesData: [
        {
          id: 'seat_info',
          header: 'Seat Information',
          body: `Section: ${ticket.section || 'N/A'}, Row: ${ticket.row || 'N/A'}, Seat: ${ticket.seatNumber || 'N/A'}`,
        },
        {
          id: 'ticket_type',
          header: 'Ticket Type',
          body: ticket.type || 'General Admission',
        },
      ],
      locations: walletPass.locations,
      validTimeInterval: {
        start: {
          date: event.startDate?.toISOString().split('T')[0],
        },
        end: walletPass.expiresAt ? {
          date: walletPass.expiresAt.toISOString().split('T')[0],
        } : undefined,
      },
      notifications: {
        upcomingNotification: {
          enableNotification: true,
        },
        expiryNotification: {
          enableNotification: true,
        },
      },
      passConstraints: {
        screenshotEligibility: 'ELIGIBLE' as const,
        nfcConstraint: [],
      },
    };

    const passData: GooglePayPassData = {
      iss: this.serviceAccountEmail,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      payload: {
        eventTicketObjects: [eventTicketObject],
      },
      ...customData,
    };

    return passData;
  }

  /**
   * Generate save URL for Google Pay
   */
  private async generateSaveUrl(passData: GooglePayPassData): Promise<string> {
    const token = await this.jwtClient.sign(passData);
    return `https://pay.google.com/gp/v/save/${token}`;
  }

  // Google Pay API methods

  private async createEventTicketClass(eventTicketClass: GooglePayEventTicketClass): Promise<void> {
    const accessToken = await this.jwtClient.getAccessToken();
    
    await this.httpService.axiosRef.post(
      `${this.baseUrl}/eventTicketClass`,
      eventTicketClass,
      {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  private async getEventTicketClass(classId: string): Promise<GooglePayEventTicketClass> {
    const accessToken = await this.jwtClient.getAccessToken();
    
    const response = await this.httpService.axiosRef.get(
      `${this.baseUrl}/eventTicketClass/${classId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
        },
      }
    );

    return response.data;
  }

  private async updateEventTicketClass(
    classId: string,
    eventTicketClass: Partial<GooglePayEventTicketClass>
  ): Promise<void> {
    const accessToken = await this.jwtClient.getAccessToken();
    
    await this.httpService.axiosRef.put(
      `${this.baseUrl}/eventTicketClass/${classId}`,
      eventTicketClass,
      {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  private async createEventTicketObject(objectId: string, eventTicketObject: any): Promise<void> {
    const accessToken = await this.jwtClient.getAccessToken();
    
    await this.httpService.axiosRef.post(
      `${this.baseUrl}/eventTicketObject`,
      eventTicketObject,
      {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  private async updateEventTicketObject(objectId: string, updateData: any): Promise<void> {
    const accessToken = await this.jwtClient.getAccessToken();
    
    await this.httpService.axiosRef.put(
      `${this.baseUrl}/eventTicketObject/${objectId}`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  private async getDefaultTemplate(organizerId: string): Promise<PassTemplate | null> {
    return await this.templateRepository.findOne({
      where: {
        organizerId,
        passType: PassType.GOOGLE_PAY,
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
}
