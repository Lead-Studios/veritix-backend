import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import {
  CommunityChallenge,
  ChallengeStatus,
} from '../entities/community-challenge.entity';
import { ChallengeParticipation } from '../entities/challenge-participation.entity';
import { Goal } from '../entities/goal.entity';
import { User } from '../../users/entities/user.entity';
import { JoinChallengeDto } from '../dto/goals-marketplace.dto';

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  progressPercent: number;
  targetAmount: number;
  savedAmount: number;
}

@Injectable()
export class CommunityChallengeService {
  constructor(
    @InjectRepository(CommunityChallenge)
    private readonly challengeRepo: Repository<CommunityChallenge>,

    @InjectRepository(ChallengeParticipation)
    private readonly participationRepo: Repository<ChallengeParticipation>,

    @InjectRepository(Goal)
    private readonly goalRepo: Repository<Goal>,
  ) {}

  /**
   * GET /goals/challenges
   * Lists active (and upcoming) community challenges.
   */
  async findActiveChallenges(): Promise<CommunityChallenge[]> {
    const now = new Date();
    return this.challengeRepo
      .createQueryBuilder('c')
      .where('c.isActive = :active', { active: true })
      .andWhere('c.endsAt >= :now', { now })
      .loadRelationCountAndMap('c.participantCount', 'c.participations')
      .orderBy('c.startsAt', 'ASC')
      .getMany();
  }

  /**
   * POST /goals/challenges/:id/join
   * Links the user's personal goal to a challenge (opt-in only).
   */
  async joinChallenge(
    challengeId: string,
    user: User,
    dto: JoinChallengeDto,
  ): Promise<ChallengeParticipation> {
    const challenge = await this.challengeRepo.findOne({
      where: { id: challengeId, isActive: true },
      relations: ['participations'],
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge ${challengeId} not found`);
    }

    // Status check
    const now = new Date();
    if (now > challenge.endsAt) {
      throw new BadRequestException('This challenge has already ended');
    }

    // Max participants guard
    if (
      challenge.maxParticipants !== null &&
      challenge.participations.length >= challenge.maxParticipants
    ) {
      throw new BadRequestException('This challenge is already full');
    }

    // Ensure the goal belongs to the user
    const goal = await this.goalRepo.findOne({
      where: { id: dto.goalId, userId: user.id },
    });

    if (!goal) {
      throw new NotFoundException(
        `Goal ${dto.goalId} not found for current user`,
      );
    }

    // Minimum target amount check
    if (
      challenge.minTargetAmount !== null &&
      Number(goal.targetAmount) < Number(challenge.minTargetAmount)
    ) {
      throw new BadRequestException(
        `Your goal target must be at least ${challenge.minTargetAmount} to join this challenge`,
      );
    }

    // Duplicate participation check (unique constraint also covers this at DB level)
    const existing = await this.participationRepo.findOne({
      where: { challengeId, userId: user.id },
    });

    if (existing) {
      throw new ConflictException('You have already joined this challenge');
    }

    const participation = this.participationRepo.create({
      challengeId,
      userId: user.id,
      goalId: dto.goalId,
    });

    return this.participationRepo.save(participation);
  }

  /**
   * GET /goals/challenges/:id/leaderboard
   * Returns top 10 participants ranked by % of personal target reached.
   * Absolute saved amounts are exposed only for own entry; others see % only.
   */
  async getLeaderboard(
    challengeId: string,
    requestingUserId: string,
  ): Promise<LeaderboardEntry[]> {
    const challenge = await this.challengeRepo.findOne({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge ${challengeId} not found`);
    }

    // Load participations with their linked goals
    const participations = await this.participationRepo
      .createQueryBuilder('cp')
      .innerJoinAndSelect('cp.goal', 'g')
      .where('cp.challengeId = :challengeId', { challengeId })
      .getMany();

    // Compute progress % for each and sort descending
    const ranked = participations
      .map((cp) => {
        const goal = cp.goal;
        const target = Number(goal.targetAmount);
        const saved = Number(goal.savedAmount);
        const progressPercent =
          target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
        return {
          userId: cp.userId,
          goalId: cp.goalId,
          displayName: goal.displayName ?? this.anonymize(cp.userId),
          progressPercent,
          targetAmount: target,
          savedAmount: saved,
        };
      })
      .sort((a, b) => b.progressPercent - a.progressPercent)
      .slice(0, 10);

    // Map to public view — hide absolute amounts unless it's the requesting user
    return ranked.map((entry, index) => ({
      rank: index + 1,
      displayName: entry.displayName,
      progressPercent: entry.progressPercent,
      // Only reveal raw amounts for the user's own entry
      targetAmount:
        entry.userId === requestingUserId ? entry.targetAmount : 0,
      savedAmount:
        entry.userId === requestingUserId ? entry.savedAmount : 0,
    }));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private anonymize(userId: string): string {
    return `Saver#${userId.slice(-4).toUpperCase()}`;
  }
}
