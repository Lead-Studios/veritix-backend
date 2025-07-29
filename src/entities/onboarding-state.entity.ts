import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AccountType, OnboardingStep } from '../types/onboarding.types';

@Entity('onboarding_states')
export class OnboardingStateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ type: 'enum', enum: AccountType })
  accountType: AccountType;

  @Column({ type: 'enum', enum: OnboardingStep })
  currentStep: OnboardingStep;

  @Column({ type: 'json', default: [] })
  completedSteps: OnboardingStep[];

  @Column({ type: 'json', default: [] })
  skippedSteps: OnboardingStep[];

  @Column()
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}