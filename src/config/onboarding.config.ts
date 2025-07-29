import { Injectable } from '@nestjs/common';
import { AccountType, OnboardingStep, OnboardingConfig } from '../types/onboarding.types';

@Injectable()
export class OnboardingConfigService {
  private readonly configs: Record<AccountType, OnboardingConfig> = {
    [AccountType.FREE]: {
      accountType: AccountType.FREE,
      steps: [
        OnboardingStep.WELCOME,
        OnboardingStep.PROFILE_SETUP,
        OnboardingStep.FIRST_PROJECT,
        OnboardingStep.COMPLETED
      ],
      eventLimits: {
        maxProjects: 3,
        maxTeamMembers: 1,
        maxIntegrations: 2,
        maxApiCalls: 1000
      },
      features: ['basic_analytics', 'email_support'],
      documentation: {
        [OnboardingStep.WELCOME]: {
          title: 'Welcome to the Platform',
          description: 'Get started with your free account',
          docsUrl: '/docs/getting-started'
        },
        [OnboardingStep.PROFILE_SETUP]: {
          title: 'Set Up Your Profile',
          description: 'Complete your profile information',
          docsUrl: '/docs/profile-setup'
        },
        [OnboardingStep.FIRST_PROJECT]: {
          title: 'Create Your First Project',
          description: 'Start building with your first project',
          docsUrl: '/docs/first-project',
          videoUrl: '/videos/create-project'
        }
      }
    },
    [AccountType.PRO]: {
      accountType: AccountType.PRO,
      steps: [
        OnboardingStep.WELCOME,
        OnboardingStep.PROFILE_SETUP,
        OnboardingStep.WORKSPACE_CREATION,
        OnboardingStep.TEAM_INVITATION,
        OnboardingStep.INTEGRATION_SETUP,
        OnboardingStep.FIRST_PROJECT,
        OnboardingStep.COMPLETED
      ],
      eventLimits: {
        maxProjects: 25,
        maxTeamMembers: 10,
        maxIntegrations: 15,
        maxApiCalls: 50000
      },
      features: ['advanced_analytics', 'priority_support', 'custom_integrations'],
      documentation: {
        [OnboardingStep.WELCOME]: {
          title: 'Welcome to Pro',
          description: 'Unlock advanced features with your Pro account',
          docsUrl: '/docs/pro-getting-started'
        },
        [OnboardingStep.WORKSPACE_CREATION]: {
          title: 'Create Your Workspace',
          description: 'Set up a collaborative workspace',
          docsUrl: '/docs/workspace-setup'
        },
        [OnboardingStep.TEAM_INVITATION]: {
          title: 'Invite Team Members',
          description: 'Collaborate with your team',
          docsUrl: '/docs/team-management'
        },
        [OnboardingStep.INTEGRATION_SETUP]: {
          title: 'Connect Integrations',
          description: 'Enhance your workflow with integrations',
          docsUrl: '/docs/integrations'
        }
      }
    },
    [AccountType.ENTERPRISE]: {
      accountType: AccountType.ENTERPRISE,
      steps: [
        OnboardingStep.WELCOME,
        OnboardingStep.PROFILE_SETUP,
        OnboardingStep.WORKSPACE_CREATION,
        OnboardingStep.TEAM_INVITATION,
        OnboardingStep.INTEGRATION_SETUP,
        OnboardingStep.FIRST_PROJECT,
        OnboardingStep.COMPLETED
      ],
      eventLimits: {
        maxProjects: -1, // unlimited
        maxTeamMembers: -1, // unlimited
        maxIntegrations: -1, // unlimited
        maxApiCalls: -1 // unlimited
      },
      features: [
        'enterprise_analytics',
        'dedicated_support',
        'custom_integrations',
        'sso',
        'audit_logs',
        'priority_onboarding'
      ],
      documentation: {
        [OnboardingStep.WELCOME]: {
          title: 'Welcome to Enterprise',
          description: 'Enterprise-grade features and dedicated support',
          docsUrl: '/docs/enterprise-getting-started'
        }
      }
    }
  };

  getConfig(accountType: AccountType): OnboardingConfig {
    return this.configs[accountType];
  }

  getAllConfigs(): Record<AccountType, OnboardingConfig> {
    return this.configs;
  }
}