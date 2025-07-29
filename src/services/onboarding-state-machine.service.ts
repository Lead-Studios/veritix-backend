import { Injectable, BadRequestException } from '@nestjs/common';
import { OnboardingStep, AccountType, UserOnboardingState } from '../types/onboarding.types';
import { OnboardingConfigService } from '../config/onboarding.config';

@Injectable()
export class OnboardingStateMachineService {
  constructor(private readonly configService: OnboardingConfigService) {}

  initializeOnboarding(userId: string, accountType: AccountType): UserOnboardingState {
    const config = this.configService.getConfig(accountType);
    
    return {
      userId,
      accountType,
      currentStep: config.steps[0],
      completedSteps: [],
      skippedSteps: [],
      startedAt: new Date(),
      metadata: {}
    };
  }

  canTransitionTo(
    currentState: UserOnboardingState, 
    targetStep: OnboardingStep
  ): boolean {
    const config = this.configService.getConfig(currentState.accountType);
    const steps = config.steps;
    
    const currentIndex = steps.indexOf(currentState.currentStep);
    const targetIndex = steps.indexOf(targetStep);
    
    // Can move to next step or skip to any future step
    return targetIndex > currentIndex || targetStep === OnboardingStep.COMPLETED;
  }

  transitionToStep(
    currentState: UserOnboardingState, 
    targetStep: OnboardingStep,
    skipCurrent = false
  ): UserOnboardingState {
    if (!this.canTransitionTo(currentState, targetStep)) {
      throw new BadRequestException(
        `Cannot transition from ${currentState.currentStep} to ${targetStep}`
      );
    }

    const config = this.configService.getConfig(currentState.accountType);
    const newState = { ...currentState };

    // Mark current step as completed or skipped
    if (skipCurrent) {
      newState.skippedSteps = [...newState.skippedSteps, currentState.currentStep];
    } else {
      newState.completedSteps = [...newState.completedSteps, currentState.currentStep];
    }

    // Set new current step
    newState.currentStep = targetStep;

    // Mark as completed if reached final step
    if (targetStep === OnboardingStep.COMPLETED) {
      newState.completedAt = new Date();
    }

    return newState;
  }

  getNextStep(currentState: UserOnboardingState): OnboardingStep | null {
    const config = this.configService.getConfig(currentState.accountType);
    const currentIndex = config.steps.indexOf(currentState.currentStep);
    
    if (currentIndex < config.steps.length - 1) {
      return config.steps[currentIndex + 1];
    }
    
    return null;
  }

  getPreviousStep(currentState: UserOnboardingState): OnboardingStep | null {
    const config = this.configService.getConfig(currentState.accountType);
    const currentIndex = config.steps.indexOf(currentState.currentStep);
    
    if (currentIndex > 0) {
      return config.steps[currentIndex - 1];
    }
    
    return null;
  }

  getProgress(currentState: UserOnboardingState): {
    current: number;
    total: number;
    percentage: number;
  } {
    const config = this.configService.getConfig(currentState.accountType);
    const currentIndex = config.steps.indexOf(currentState.currentStep);
    const total = config.steps.length;
    
    return {
      current: currentIndex + 1,
      total,
      percentage: Math.round(((currentIndex + 1) / total) * 100)
    };
  }
}