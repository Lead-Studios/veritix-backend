import { IsEnum, IsOptional, IsObject, IsString } from 'class-validator';
import { AccountType, OnboardingStep } from '../types/onboarding.types';

export class InitializeOnboardingDto {
  @IsEnum(AccountType)
  accountType: AccountType;
}

export class CompleteStepDto {
  @IsOptional()
  @IsObject()
  stepData?: Record<string, any>;
}

export class JumpToStepDto {
  @IsEnum(OnboardingStep)
  targetStep: OnboardingStep;
}
