import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoalTemplate } from '../entities/goal-template.entity';
import { Goal, GoalStatus } from '../entities/goal.entity';
import { User } from '../../users/entities/user.entity';
import {
  CreateGoalFromTemplateDto,
  GoalTemplateFilterDto,
} from '../dto/goals-marketplace.dto';

@Injectable()
export class GoalTemplateService {
  constructor(
    @InjectRepository(GoalTemplate)
    private readonly templateRepo: Repository<GoalTemplate>,

    @InjectRepository(Goal)
    private readonly goalRepo: Repository<Goal>,
  ) {}

  /**
   * GET /goals/templates
   * Returns all active public templates, optionally filtered by category.
   */
  async findAll(filter: GoalTemplateFilterDto): Promise<GoalTemplate[]> {
    const qb = this.templateRepo
      .createQueryBuilder('t')
      .where('t.isActive = :active', { active: true })
      .orderBy('t.usageCount', 'DESC');

    if (filter.category) {
      qb.andWhere('t.category = :category', { category: filter.category });
    }

    return qb.getMany();
  }

  /**
   * POST /goals (from template)
   * Pre-fills goal fields from the template; caller may override amounts/duration.
   */
  async createGoalFromTemplate(
    user: User,
    dto: CreateGoalFromTemplateDto,
  ): Promise<Goal> {
    const template = await this.templateRepo.findOne({
      where: { id: dto.templateId, isActive: true },
    });

    if (!template) {
      throw new NotFoundException(
        `Goal template ${dto.templateId} not found or inactive`,
      );
    }

    // Compute target date from duration
    let targetDate: string | null = null;
    const durationDays = dto.durationDays ?? template.defaultDurationDays;
    if (durationDays) {
      const d = new Date();
      d.setDate(d.getDate() + durationDays);
      targetDate = d.toISOString().split('T')[0];
    }

    const goal = this.goalRepo.create({
      userId: user.id,
      templateId: template.id,
      name: dto.name ?? template.name,
      description: template.description,
      targetAmount: dto.targetAmount ?? template.defaultTargetAmount ?? 0,
      savedAmount: 0,
      targetDate,
      status: GoalStatus.IN_PROGRESS,
      isPublic: dto.isPublic ?? false,
      displayName: dto.displayName ?? user.displayName ?? null,
    });

    // Increment usage counter (fire-and-forget to avoid blocking the response)
    this.templateRepo.increment({ id: template.id }, 'usageCount', 1).catch(
      () => {/* non-critical */},
    );

    return this.goalRepo.save(goal);
  }

  /**
   * GET /goals/public
   * Returns public goals for inspiration.
   * Real names are NEVER included — only displayName is returned.
   */
  async findPublicGoals(): Promise<PublicGoalView[]> {
    const goals = await this.goalRepo
      .createQueryBuilder('g')
      .where('g.isPublic = :pub', { pub: true })
      .andWhere('g.status = :status', { status: GoalStatus.IN_PROGRESS })
      .orderBy('g.createdAt', 'DESC')
      .take(50)
      .getMany();

    return goals.map((g) => this.toPublicView(g));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private toPublicView(goal: Goal): PublicGoalView {
    return {
      id: goal.id,
      name: goal.name,
      description: goal.description,
      targetAmount: Number(goal.targetAmount),
      savedAmount: Number(goal.savedAmount),
      progressPercent: goal.progressPercent,
      targetDate: goal.targetDate,
      displayName: goal.displayName ?? this.anonymize(goal.userId),
      createdAt: goal.createdAt,
    };
  }

  /** Last-resort anonymisation when no display name is set */
  private anonymize(userId: string): string {
    return `Saver#${userId.slice(-4).toUpperCase()}`;
  }
}

export interface PublicGoalView {
  id: string;
  name: string;
  description: string | null;
  targetAmount: number;
  savedAmount: number;
  progressPercent: number;
  targetDate: string | null;
  displayName: string;
  createdAt: Date;
}
