export enum AccountType {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}
export enum OnboardingStep {
  WELCOME = 'welcome',
  PROFILE_SETUP = 'profile_setup',
  WORKSPACE_CREATION = 'workspace_creation',
  TEAM_INVITATION = 'team_invitation',
  INTEGRATION_SETUP = 'integration_setup',
  FIRST_PROJECT = 'first_project',
  COMPLETED = 'completed'
}

export interface OnboardingConfig {
  accountType: AccountType;
  steps: OnboardingStep[];
  eventLimits: {
    maxProjects: number;
    maxTeamMembers: number;
    maxIntegrations: number;
    maxApiCalls: number;
  };
  documentation: {
    [key in OnboardingStep]?: {
      title: string;
      description: string;
      docsUrl?: string;
      videoUrl?: string;
    };
  };
  features: string[];
}

export interface UserOnboardingState {
  userId: string;
  accountType: AccountType;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  startedAt: Date;
  completedAt?: Date;
  skippedSteps: OnboardingStep[];
  metadata?: Record<string, any>;
}
export interface OnboardingProgress {
  userId: string;
  currentStep: OnboardingStep;
  totalSteps: number;
  completedSteps: OnboardingStep[];
  progressPercentage: number;
  estimatedCompletionTime?: string; // e.g., "2 days"
}