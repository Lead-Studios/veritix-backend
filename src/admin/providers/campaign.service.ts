import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { CampaignEmail } from '../entities/campaign-email.entity';
import { CreateCampaignEmailDto } from '../dto/create-campaign-email.dto';
import { UpdateCampaignEmailDto } from '../dto/update-campaign-email.dto';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    @InjectRepository(CampaignEmail)
    private campaignEmailRepository: Repository<CampaignEmail>,
  ) {}

  async createCampaignEmail(createDto: CreateCampaignEmailDto): Promise<CampaignEmail> {
    try {
      this.logger.log('Creating new campaign email');
      const campaignEmail = this.campaignEmailRepository.create(createDto);
      return await this.campaignEmailRepository.save(campaignEmail);
    } catch (error) {
      this.logger.error(`Failed to create campaign email: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAllCampaignEmails(): Promise<CampaignEmail[]> {
    try {
      this.logger.log('Retrieving all campaign emails');
      return await this.campaignEmailRepository.find({
        where: { isArchived: false },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to retrieve campaign emails: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCampaignEmailById(id: string): Promise<CampaignEmail> {
    try {
      this.logger.log(`Retrieving campaign email with ID: ${id}`);
      const campaignEmail = await this.campaignEmailRepository.findOne({
        where: { id, isArchived: false },
      });

      if (!campaignEmail) {
        throw new NotFoundException(`Campaign email with ID ${id} not found`);
      }

      return campaignEmail;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve campaign email: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateCampaignEmail(id: string, updateDto: UpdateCampaignEmailDto): Promise<CampaignEmail> {
    try {
      this.logger.log(`Updating campaign email with ID: ${id}`);
      const campaignEmail = await this.getCampaignEmailById(id);
      
      Object.assign(campaignEmail, updateDto);
      return await this.campaignEmailRepository.save(campaignEmail);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update campaign email: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteCampaignEmail(id: string): Promise<void> {
    try {
      this.logger.log(`Deleting campaign email with ID: ${id}`);
      const campaignEmail = await this.getCampaignEmailById(id);
      
      // Soft delete
      await this.campaignEmailRepository.softDelete(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete campaign email: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCampaignStatistics(): Promise<{
    totalCampaigns: number;
    sentCampaigns: number;
    scheduledCampaigns: number;
  }> {
    try {
      this.logger.log('Retrieving campaign statistics');
      const totalCampaigns = await this.campaignEmailRepository.count({ where: { isArchived: false } });
      const sentCampaigns = await this.campaignEmailRepository.count({ where: { isArchived: false, isSent: true } });
      const scheduledCampaigns = await this.campaignEmailRepository.count({ 
        where: { 
          isArchived: false, 
          isSent: false,
          scheduledDate: Not(IsNull()) 
        } 
      });

      return {
        totalCampaigns,
        sentCampaigns,
        scheduledCampaigns,
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve campaign statistics: ${error.message}`, error.stack);
      throw error;
    }
  }
} 