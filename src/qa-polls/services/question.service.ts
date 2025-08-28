import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Question, QuestionStatus } from '../entities/question.entity';
import { QuestionVote, VoteType } from '../entities/question-vote.entity';
import { CreateQuestionDto } from '../dto/create-question.dto';
import { UpdateQuestionDto } from '../dto/update-question.dto';
import { VoteQuestionDto } from '../dto/vote-question.dto';

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(QuestionVote)
    private questionVoteRepository: Repository<QuestionVote>,
  ) {}

  async create(createQuestionDto: CreateQuestionDto, userId: string, ownerId?: string): Promise<Question> {
    const question = this.questionRepository.create({
      ...createQuestionDto,
      submittedById: createQuestionDto.isAnonymous ? null : userId,
      ownerId: ownerId || userId,
    });

    return this.questionRepository.save(question);
  }

  async findAll(eventId: string, ownerId?: string): Promise<Question[]> {
    const where: FindOptionsWhere<Question> = { eventId };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    return this.questionRepository.find({
      where,
      relations: ['submittedBy', 'votes'],
      order: {
        isPinned: 'DESC',
        upvotes: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async findByStatus(eventId: string, status: QuestionStatus, ownerId?: string): Promise<Question[]> {
    const where: FindOptionsWhere<Question> = { eventId, status };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    return this.questionRepository.find({
      where,
      relations: ['submittedBy', 'votes'],
      order: {
        isPinned: 'DESC',
        upvotes: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string, ownerId?: string): Promise<Question> {
    const where: FindOptionsWhere<Question> = { id };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    const question = await this.questionRepository.findOne({
      where,
      relations: ['submittedBy', 'votes', 'votes.user'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return question;
  }

  async update(id: string, updateQuestionDto: UpdateQuestionDto, userId: string, ownerId?: string): Promise<Question> {
    const question = await this.findOne(id, ownerId);

    // Check if user has permission to update
    if (question.submittedById && question.submittedById !== userId && !this.isModeratorAction(updateQuestionDto)) {
      throw new ForbiddenException('You can only update your own questions');
    }

    // Set moderation fields if this is a moderation action
    if (this.isModeratorAction(updateQuestionDto)) {
      updateQuestionDto.moderatedBy = userId;
      updateQuestionDto.moderatedAt = new Date();
    }

    // Set answer fields if answering
    if (updateQuestionDto.answer) {
      updateQuestionDto.answeredBy = userId;
      updateQuestionDto.answeredAt = new Date();
      updateQuestionDto.status = QuestionStatus.ANSWERED;
    }

    Object.assign(question, updateQuestionDto);
    return this.questionRepository.save(question);
  }

  async remove(id: string, userId: string, ownerId?: string): Promise<void> {
    const question = await this.findOne(id, ownerId);

    // Check if user has permission to delete
    if (question.submittedById && question.submittedById !== userId) {
      throw new ForbiddenException('You can only delete your own questions');
    }

    await this.questionRepository.softDelete(id);
  }

  async vote(voteQuestionDto: VoteQuestionDto, userId: string, ownerId?: string): Promise<Question> {
    const question = await this.findOne(voteQuestionDto.questionId, ownerId);

    // Check if user already voted
    const existingVote = await this.questionVoteRepository.findOne({
      where: {
        questionId: voteQuestionDto.questionId,
        userId,
        ...(ownerId && { ownerId }),
      },
    });

    if (existingVote) {
      // Update existing vote if different
      if (existingVote.type !== voteQuestionDto.type) {
        // Update vote counts
        if (existingVote.type === VoteType.UPVOTE) {
          question.upvotes--;
        } else {
          question.downvotes--;
        }

        if (voteQuestionDto.type === VoteType.UPVOTE) {
          question.upvotes++;
        } else {
          question.downvotes++;
        }

        existingVote.type = voteQuestionDto.type;
        await this.questionVoteRepository.save(existingVote);
      }
    } else {
      // Create new vote
      const vote = this.questionVoteRepository.create({
        ...voteQuestionDto,
        userId,
        ownerId: ownerId || userId,
      });

      await this.questionVoteRepository.save(vote);

      // Update vote counts
      if (voteQuestionDto.type === VoteType.UPVOTE) {
        question.upvotes++;
      } else {
        question.downvotes++;
      }
    }

    return this.questionRepository.save(question);
  }

  async removeVote(questionId: string, userId: string, ownerId?: string): Promise<Question> {
    const question = await this.findOne(questionId, ownerId);

    const vote = await this.questionVoteRepository.findOne({
      where: {
        questionId,
        userId,
        ...(ownerId && { ownerId }),
      },
    });

    if (!vote) {
      throw new NotFoundException('Vote not found');
    }

    // Update vote counts
    if (vote.type === VoteType.UPVOTE) {
      question.upvotes--;
    } else {
      question.downvotes--;
    }

    await this.questionVoteRepository.remove(vote);
    return this.questionRepository.save(question);
  }

  async moderate(id: string, status: QuestionStatus, moderationNote: string, userId: string, ownerId?: string): Promise<Question> {
    const updateDto: UpdateQuestionDto = {
      status,
      moderationNote,
      moderatedBy: userId,
      moderatedAt: new Date(),
    };

    return this.update(id, updateDto, userId, ownerId);
  }

  private isModeratorAction(updateDto: UpdateQuestionDto): boolean {
    return !!(updateDto.status || updateDto.moderationNote || updateDto.isPinned !== undefined || updateDto.isHighlighted !== undefined);
  }
}
