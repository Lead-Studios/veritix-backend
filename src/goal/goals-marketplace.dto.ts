import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { GoalCategory } from '../entities/goal-template.entity';

// ── Template DTOs ────────────────────────────────────────────────────────────

export class CreateGoalFromTemplateDto {
  @IsUUID()
  templateId: string;

  /** Override the template's suggested target (optional) */
  @IsOptional()
  @IsInt()
  @Min(1)
  targetAmount?: number;

  /** Override the template's suggested duration in days (optional) */
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  /** Custom goal name (falls back to template name) */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  /** Anonymised display name for public leaderboards */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  displayName?: string;

  /** Make this goal visible in /goals/public straight away */
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

// ── Challenge DTOs ───────────────────────────────────────────────────────────

export class JoinChallengeDto {
  /** The user's personal goal they wish to link to this challenge */
  @IsUUID()
  goalId: string;
}

// ── Public goal visibility toggle ────────────────────────────────────────────

export class UpdateGoalVisibilityDto {
  @IsBoolean()
  isPublic: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  displayName?: string;
}

// ── Query / filter DTOs ──────────────────────────────────────────────────────

export class GoalTemplateFilterDto {
  @IsOptional()
  @IsEnum(GoalCategory)
  category?: GoalCategory;
}
