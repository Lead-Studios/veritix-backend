import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GoalTemplateService } from '../services/goal-template.service';
import { CommunityChallengeService } from '../services/community-challenge.service';
import {
  CreateGoalFromTemplateDto,
  GoalTemplateFilterDto,
  JoinChallengeDto,
  UpdateGoalVisibilityDto,
} from '../dto/goals-marketplace.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Goal } from '../entities/goal.entity';
import { NotFoundException } from '@nestjs/common';

@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsMarketplaceController {
  constructor(
    private readonly templateService: GoalTemplateService,
    private readonly challengeService: CommunityChallengeService,

    @InjectRepository(Goal)
    private readonly goalRepo: Repository<Goal>,
  ) {}

  // ── Templates ──────────────────────────────────────────────────────────────

  /**
   * GET /goals/templates
   * Returns all active public templates with admin-configured defaults.
   */
  @Get('templates')
  async listTemplates(@Query() filter: GoalTemplateFilterDto) {
    return this.templateService.findAll(filter);
  }

  /**
   * POST /goals/from-template
   * Creates a new goal pre-filled from a template.
   * (Kept under /goals to stay close to the existing POST /goals route.)
   */
  @Post('from-template')
  async createFromTemplate(
    @Request() req,
    @Body() dto: CreateGoalFromTemplateDto,
  ) {
    return this.templateService.createGoalFromTemplate(req.user, dto);
  }

  // ── Public goals ───────────────────────────────────────────────────────────

  /**
   * GET /goals/public
   * Returns all public goals for inspiration — real names are never exposed.
   */
  @Get('public')
  async listPublicGoals() {
    return this.templateService.findPublicGoals();
  }

  /**
   * PATCH /goals/:id/visibility
   * Opt-in / opt-out of public listing for a goal the user owns.
   */
  @Patch(':id/visibility')
  async updateVisibility(
    @Request() req,
    @Param('id', ParseUUIDPipe) goalId: string,
    @Body() dto: UpdateGoalVisibilityDto,
  ) {
    const goal = await this.goalRepo.findOne({
      where: { id: goalId, userId: req.user.id },
    });

    if (!goal) {
      throw new NotFoundException(`Goal ${goalId} not found`);
    }

    goal.isPublic = dto.isPublic;
    if (dto.displayName !== undefined) {
      goal.displayName = dto.displayName;
    }

    return this.goalRepo.save(goal);
  }

  // ── Challenges ─────────────────────────────────────────────────────────────

  /**
   * GET /goals/challenges
   * Lists active community challenges.
   */
  @Get('challenges')
  async listChallenges() {
    return this.challengeService.findActiveChallenges();
  }

  /**
   * POST /goals/challenges/:id/join
   * Links the authenticated user's personal goal to a challenge (opt-in).
   */
  @Post('challenges/:id/join')
  async joinChallenge(
    @Request() req,
    @Param('id', ParseUUIDPipe) challengeId: string,
    @Body() dto: JoinChallengeDto,
  ) {
    return this.challengeService.joinChallenge(challengeId, req.user, dto);
  }

  /**
   * GET /goals/challenges/:id/leaderboard
   * Returns the top 10 participants ranked by % of personal target reached.
   */
  @Get('challenges/:id/leaderboard')
  async getLeaderboard(
    @Request() req,
    @Param('id', ParseUUIDPipe) challengeId: string,
  ) {
    return this.challengeService.getLeaderboard(challengeId, req.user.id);
  }
}
