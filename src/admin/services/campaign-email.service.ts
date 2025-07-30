import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignEmail } from '../entities/campaign-email.entity';
import { CreateCampaignEmailDto } from '../dtos/create-campaign-email.dto';
import { UpdateCampaignEmailDto } from '../dtos/update-campaign-email.dto';
import { CampaignEmailResource } from '../resources/campaign-email.resource';

@Injectable()
export class CampaignEmailService {
  constructor(
    @InjectRepository(CampaignEmail)
    private readonly campaignEmailRepo: Repository<CampaignEmail>,
  ) {}

  async create(dto: CreateCampaignEmailDto) {
    const email = this.campaignEmailRepo.create(dto);
    return CampaignEmailResource.toResponse(
      await this.campaignEmailRepo.save(email),
    );
  }

  async findAll() {
    const emails = await this.campaignEmailRepo.find();
    return CampaignEmailResource.toArray(emails);
  }

  async findOne(id: string) {
    const email = await this.campaignEmailRepo.findOne({ where: { id } });
    if (!email) throw new NotFoundException('Campaign email not found');
    return CampaignEmailResource.toResponse(email);
  }

  async update(dto: UpdateCampaignEmailDto) {
    await this.campaignEmailRepo.update(dto.id, dto);
    return this.findOne(dto.id);
  }

  async delete(id: string) {
    const email = await this.campaignEmailRepo.findOne({ where: { id } });
    if (!email) throw new NotFoundException('Campaign email not found');
    await this.campaignEmailRepo.delete(id);
    return { deleted: true };
  }
}
