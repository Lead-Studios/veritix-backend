import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import { Poll, PollStatus, PollType } from '../entities/poll.entity';
import { PollOption } from '../entities/poll-option.entity';
import { PollVote } from '../entities/poll-vote.entity';
import { CreatePollDto } from '../dto/create-poll.dto';
import { UpdatePollDto } from '../dto/update-poll.dto';
import { VotePollDto } from '../dto/vote-poll.dto';

@Injectable()
export class PollService {
  constructor(
    @InjectRepository(Poll)
    private pollRepository: Repository<Poll>,
    @InjectRepository(PollOption)
    private pollOptionRepository: Repository<PollOption>,
    @InjectRepository(PollVote)
    private pollVoteRepository: Repository<PollVote>,
  ) {}

  async create(createPollDto: CreatePollDto, userId: string, ownerId?: string): Promise<Poll> {
    const { options, ...pollData } = createPollDto;

    const poll = this.pollRepository.create({
      ...pollData,
      createdById: userId,
      ownerId: ownerId || userId,
      startsAt: createPollDto.startsAt ? new Date(createPollDto.startsAt) : null,
      endsAt: createPollDto.endsAt ? new Date(createPollDto.endsAt) : null,
    });

    const savedPoll = await this.pollRepository.save(poll);

    // Create poll options
    const pollOptions = options.map((option, index) =>
      this.pollOptionRepository.create({
        ...option,
        pollId: savedPoll.id,
        order: option.order ?? index,
        ownerId: ownerId || userId,
      }),
    );

    await this.pollOptionRepository.save(pollOptions);

    return this.findOne(savedPoll.id, ownerId);
  }

  async findAll(eventId: string, ownerId?: string): Promise<Poll[]> {
    const where: FindOptionsWhere<Poll> = { eventId };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    return this.pollRepository.find({
      where,
      relations: ['createdBy', 'options', 'votes'],
      order: {
        isPinned: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async findByStatus(eventId: string, status: PollStatus, ownerId?: string): Promise<Poll[]> {
    const where: FindOptionsWhere<Poll> = { eventId, status };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    return this.pollRepository.find({
      where,
      relations: ['createdBy', 'options', 'votes'],
      order: {
        isPinned: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async findActive(eventId: string, ownerId?: string): Promise<Poll[]> {
    const now = new Date();
    const where: FindOptionsWhere<Poll> = {
      eventId,
      status: PollStatus.ACTIVE,
    };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    const polls = await this.pollRepository.find({
      where,
      relations: ['createdBy', 'options', 'votes'],
      order: {
        isPinned: 'DESC',
        createdAt: 'DESC',
      },
    });

    // Filter by time constraints
    return polls.filter(poll => {
      const isStarted = !poll.startsAt || poll.startsAt <= now;
      const isNotEnded = !poll.endsAt || poll.endsAt > now;
      return isStarted && isNotEnded;
    });
  }

  async findOne(id: string, ownerId?: string): Promise<Poll> {
    const where: FindOptionsWhere<Poll> = { id };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    const poll = await this.pollRepository.findOne({
      where,
      relations: ['createdBy', 'options', 'votes', 'votes.user', 'votes.option'],
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    return poll;
  }

  async update(id: string, updatePollDto: UpdatePollDto, userId: string, ownerId?: string): Promise<Poll> {
    const poll = await this.findOne(id, ownerId);

    // Check if user has permission to update
    if (poll.createdById !== userId && !this.isModeratorAction(updatePollDto)) {
      throw new ForbiddenException('You can only update your own polls');
    }

    // Set moderation fields if this is a moderation action
    if (this.isModeratorAction(updatePollDto)) {
      updatePollDto.moderatedBy = userId;
      updatePollDto.moderatedAt = new Date();
    }

    // Convert date strings to Date objects
    if (updatePollDto.startsAt) {
      updatePollDto.startsAt = new Date(updatePollDto.startsAt);
    }
    if (updatePollDto.endsAt) {
      updatePollDto.endsAt = new Date(updatePollDto.endsAt);
    }

    Object.assign(poll, updatePollDto);
    return this.pollRepository.save(poll);
  }

  async remove(id: string, userId: string, ownerId?: string): Promise<void> {
    const poll = await this.findOne(id, ownerId);

    // Check if user has permission to delete
    if (poll.createdById !== userId) {
      throw new ForbiddenException('You can only delete your own polls');
    }

    await this.pollRepository.softDelete(id);
  }

  async vote(votePollDto: VotePollDto, userId: string, ownerId?: string): Promise<Poll> {
    const poll = await this.findOne(votePollDto.pollId, ownerId);

    // Check if poll is active and within time constraints
    if (poll.status !== PollStatus.ACTIVE) {
      throw new BadRequestException('Poll is not active');
    }

    const now = new Date();
    if (poll.startsAt && poll.startsAt > now) {
      throw new BadRequestException('Poll has not started yet');
    }
    if (poll.endsAt && poll.endsAt <= now) {
      throw new BadRequestException('Poll has ended');
    }

    // Check if user already voted (if multiple votes not allowed)
    if (!poll.allowMultipleVotes) {
      const existingVote = await this.pollVoteRepository.findOne({
        where: {
          pollId: votePollDto.pollId,
          userId,
          ...(ownerId && { ownerId }),
        },
      });

      if (existingVote) {
        throw new BadRequestException('You have already voted in this poll');
      }
    }

    // Validate vote based on poll type
    await this.validateVote(poll, votePollDto);

    // Create votes
    const votes = await this.createVotes(poll, votePollDto, userId, ownerId);

    // Update vote counts
    await this.updateVoteCounts(poll, votes);

    return this.findOne(poll.id, ownerId);
  }

  async getUserVote(pollId: string, userId: string, ownerId?: string): Promise<PollVote[]> {
    const where: FindOptionsWhere<PollVote> = { pollId, userId };
    if (ownerId) {
      where.ownerId = ownerId;
    }

    return this.pollVoteRepository.find({
      where,
      relations: ['option'],
    });
  }

  async getPollResults(id: string, userId: string, ownerId?: string): Promise<any> {
    const poll = await this.findOne(id, ownerId);

    // Check if user can see results
    if (!poll.showResults) {
      throw new ForbiddenException('Results are not available for this poll');
    }

    if (poll.showResultsAfterVoting) {
      const userVote = await this.getUserVote(id, userId, ownerId);
      if (userVote.length === 0) {
        throw new ForbiddenException('You must vote before seeing results');
      }
    }

    const results = {
      poll: {
        id: poll.id,
        title: poll.title,
        type: poll.type,
        totalVotes: poll.totalVotes,
      },
      options: poll.options.map(option => ({
        id: option.id,
        text: option.text,
        voteCount: option.voteCount,
        percentage: poll.totalVotes > 0 ? (option.voteCount / poll.totalVotes) * 100 : 0,
      })),
    };

    return results;
  }

  async moderate(id: string, status: PollStatus, moderationNote: string, userId: string, ownerId?: string): Promise<Poll> {
    const updateDto: UpdatePollDto = {
      status,
      moderationNote,
      moderatedBy: userId,
      moderatedAt: new Date(),
    };

    return this.update(id, updateDto, userId, ownerId);
  }

  private async validateVote(poll: Poll, votePollDto: VotePollDto): Promise<void> {
    switch (poll.type) {
      case PollType.SINGLE_CHOICE:
        if (!votePollDto.optionIds || votePollDto.optionIds.length !== 1) {
          throw new BadRequestException('Single choice polls require exactly one option');
        }
        break;

      case PollType.MULTIPLE_CHOICE:
        if (!votePollDto.optionIds || votePollDto.optionIds.length === 0) {
          throw new BadRequestException('Multiple choice polls require at least one option');
        }
        if (poll.maxChoices > 0 && votePollDto.optionIds.length > poll.maxChoices) {
          throw new BadRequestException(`Maximum ${poll.maxChoices} choices allowed`);
        }
        break;

      case PollType.TEXT:
        if (!votePollDto.textResponse || votePollDto.textResponse.trim() === '') {
          throw new BadRequestException('Text polls require a text response');
        }
        break;

      case PollType.RATING:
        if (votePollDto.ratingValue === undefined || votePollDto.ratingValue < 1 || votePollDto.ratingValue > 10) {
          throw new BadRequestException('Rating must be between 1 and 10');
        }
        break;
    }

    // Validate option IDs exist
    if (votePollDto.optionIds && votePollDto.optionIds.length > 0) {
      const validOptions = await this.pollOptionRepository.find({
        where: { id: In(votePollDto.optionIds), pollId: poll.id },
      });

      if (validOptions.length !== votePollDto.optionIds.length) {
        throw new BadRequestException('Invalid option IDs provided');
      }
    }
  }

  private async createVotes(poll: Poll, votePollDto: VotePollDto, userId: string, ownerId?: string): Promise<PollVote[]> {
    const votes: PollVote[] = [];

    if (poll.type === PollType.TEXT || poll.type === PollType.RATING) {
      // Create single vote for text or rating
      const vote = this.pollVoteRepository.create({
        pollId: poll.id,
        userId,
        textResponse: votePollDto.textResponse,
        ratingValue: votePollDto.ratingValue,
        isAnonymous: votePollDto.isAnonymous || false,
        ownerId: ownerId || userId,
      });
      votes.push(await this.pollVoteRepository.save(vote));
    } else {
      // Create votes for each selected option
      for (const optionId of votePollDto.optionIds || []) {
        const vote = this.pollVoteRepository.create({
          pollId: poll.id,
          optionId,
          userId,
          isAnonymous: votePollDto.isAnonymous || false,
          ownerId: ownerId || userId,
        });
        votes.push(await this.pollVoteRepository.save(vote));
      }
    }

    return votes;
  }

  private async updateVoteCounts(poll: Poll, votes: PollVote[]): Promise<void> {
    // Update poll total votes
    poll.totalVotes++;
    await this.pollRepository.save(poll);

    // Update option vote counts
    for (const vote of votes) {
      if (vote.optionId) {
        await this.pollOptionRepository.increment({ id: vote.optionId }, 'voteCount', 1);
      }
    }
  }

  private isModeratorAction(updateDto: UpdatePollDto): boolean {
    return !!(updateDto.status || updateDto.moderationNote || updateDto.isPinned !== undefined);
  }
}
