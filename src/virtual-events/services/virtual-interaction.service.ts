import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VirtualEventInteraction } from '../entities/virtual-event-interaction.entity';
import { VirtualEvent } from '../entities/virtual-event.entity';
import { InteractionType } from '../enums/virtual-event.enum';
import { CreateInteractionDto } from '../dto/create-interaction.dto';

@Injectable()
export class VirtualInteractionService {
  private readonly logger = new Logger(VirtualInteractionService.name);

  constructor(
    @InjectRepository(VirtualEventInteraction)
    private readonly interactionRepository: Repository<VirtualEventInteraction>,
    @InjectRepository(VirtualEvent)
    private readonly virtualEventRepository: Repository<VirtualEvent>,
  ) {}

  async createInteraction(createInteractionDto: CreateInteractionDto): Promise<VirtualEventInteraction> {
    const virtualEvent = await this.virtualEventRepository.findOne({
      where: { id: createInteractionDto.virtualEventId },
    });

    if (!virtualEvent) {
      throw new NotFoundException('Virtual event not found');
    }

    // Check if interaction type is allowed for this event
    if (!this.isInteractionAllowed(virtualEvent, createInteractionDto.type)) {
      throw new BadRequestException(`${createInteractionDto.type} interactions are not allowed for this event`);
    }

    const interaction = this.interactionRepository.create(createInteractionDto);
    const savedInteraction = await this.interactionRepository.save(interaction);

    this.logger.log(`Created ${createInteractionDto.type} interaction for event: ${createInteractionDto.virtualEventId}`);
    return savedInteraction;
  }

  async getInteractions(
    virtualEventId: string,
    type?: InteractionType,
    limit = 50,
    offset = 0,
  ): Promise<VirtualEventInteraction[]> {
    const query = this.interactionRepository.createQueryBuilder('interaction')
      .leftJoinAndSelect('interaction.user', 'user')
      .where('interaction.virtualEventId = :virtualEventId', { virtualEventId })
      .orderBy('interaction.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    if (type) {
      query.andWhere('interaction.type = :type', { type });
    }

    return query.getMany();
  }

  async getChatMessages(virtualEventId: string, limit = 100, offset = 0): Promise<VirtualEventInteraction[]> {
    return this.getInteractions(virtualEventId, InteractionType.CHAT, limit, offset);
  }

  async getQAQuestions(virtualEventId: string, limit = 50, offset = 0): Promise<VirtualEventInteraction[]> {
    return this.getInteractions(virtualEventId, InteractionType.QA, limit, offset);
  }

  async getPollResponses(virtualEventId: string, pollId: string): Promise<VirtualEventInteraction[]> {
    return this.interactionRepository.find({
      where: {
        virtualEventId,
        type: InteractionType.POLL,
        metadata: { pollId },
      },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async moderateInteraction(
    interactionId: string,
    moderatorId: string,
    isApproved: boolean,
    moderationNote?: string,
  ): Promise<VirtualEventInteraction> {
    const interaction = await this.interactionRepository.findOne({
      where: { id: interactionId },
    });

    if (!interaction) {
      throw new NotFoundException('Interaction not found');
    }

    interaction.isModerated = true;
    interaction.isApproved = isApproved;
    interaction.moderatedBy = moderatorId;
    interaction.moderatedAt = new Date();
    interaction.moderationNote = moderationNote;

    return this.interactionRepository.save(interaction);
  }

  async highlightInteraction(interactionId: string): Promise<VirtualEventInteraction> {
    const interaction = await this.interactionRepository.findOne({
      where: { id: interactionId },
    });

    if (!interaction) {
      throw new NotFoundException('Interaction not found');
    }

    interaction.isHighlighted = true;
    return this.interactionRepository.save(interaction);
  }

  async likeInteraction(interactionId: string, userId: string): Promise<VirtualEventInteraction> {
    const interaction = await this.interactionRepository.findOne({
      where: { id: interactionId },
    });

    if (!interaction) {
      throw new NotFoundException('Interaction not found');
    }

    // In a real implementation, you'd track individual likes to prevent duplicates
    interaction.likesCount += 1;
    return this.interactionRepository.save(interaction);
  }

  async replyToInteraction(
    parentId: string,
    createInteractionDto: CreateInteractionDto,
  ): Promise<VirtualEventInteraction> {
    const parentInteraction = await this.interactionRepository.findOne({
      where: { id: parentId },
    });

    if (!parentInteraction) {
      throw new NotFoundException('Parent interaction not found');
    }

    const reply = this.interactionRepository.create({
      ...createInteractionDto,
      parentId,
    });

    const savedReply = await this.interactionRepository.save(reply);

    // Update replies count
    await this.interactionRepository.increment({ id: parentId }, 'repliesCount', 1);

    return savedReply;
  }

  async deleteInteraction(interactionId: string, userId: string): Promise<void> {
    const interaction = await this.interactionRepository.findOne({
      where: { id: interactionId },
    });

    if (!interaction) {
      throw new NotFoundException('Interaction not found');
    }

    if (interaction.userId !== userId) {
      throw new BadRequestException('You can only delete your own interactions');
    }

    await this.interactionRepository.softDelete(interactionId);
    this.logger.log(`Deleted interaction: ${interactionId}`);
  }

  async getInteractionAnalytics(virtualEventId: string): Promise<any> {
    const analytics = await this.interactionRepository
      .createQueryBuilder('interaction')
      .select('interaction.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('interaction.virtualEventId = :virtualEventId', { virtualEventId })
      .groupBy('interaction.type')
      .getRawMany();

    const totalInteractions = await this.interactionRepository.count({
      where: { virtualEventId },
    });

    const uniqueParticipants = await this.interactionRepository
      .createQueryBuilder('interaction')
      .select('COUNT(DISTINCT interaction.userId)', 'count')
      .where('interaction.virtualEventId = :virtualEventId', { virtualEventId })
      .andWhere('interaction.userId IS NOT NULL')
      .getRawOne();

    return {
      totalInteractions,
      uniqueParticipants: parseInt(uniqueParticipants.count),
      interactionsByType: analytics.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }

  private isInteractionAllowed(virtualEvent: VirtualEvent, type: InteractionType): boolean {
    switch (type) {
      case InteractionType.CHAT:
        return virtualEvent.allowChat;
      case InteractionType.POLL:
        return virtualEvent.allowPolls;
      case InteractionType.QA:
        return virtualEvent.allowQA;
      case InteractionType.REACTION:
      case InteractionType.RAISE_HAND:
        return true; // These are generally always allowed
      case InteractionType.BREAKOUT_REQUEST:
        return virtualEvent.allowBreakoutRooms;
      default:
        return false;
    }
  }
}
