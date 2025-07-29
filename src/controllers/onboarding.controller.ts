import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  UseGuards,
  Request
} from '@nestjs/common';
import { OnboardingService } from '../services/onboarding.service';
import { 
  InitializeOnboardingDto, 
  CompleteStepDto, 
  JumpToStepDto 
} from '../dto/onboarding.dto';
// import { AuthGuard } from '../guards/auth.guard'; // Assuming you have auth

@Controller('onboarding')
// @UseGuards(AuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('initialize')
  async initializeOnboarding(
    @Request() req: any,
    @Body() dto: InitializeOnboardingDto
  ) {
    const userId = req.user.id; // Assuming user is in request
    return this.onboardingService.initializeUserOnboarding(userId, dto.accountType);
  }

  @Get('state')
  async getCurrentState(@Request() req: any) {
    const userId = req.user.id;
    return this.onboardingService.getOnboardingInfo(userId);
  }

  @Put('complete-step')
  async completeStep(
    @Request() req: any,
    @Body() dto: CompleteStepDto
  ) {
    const userId = req.user.id;
    return this.onboardingService.completeStep(userId, dto.stepData);
  }

  @Put('skip-step')
  async skipStep(@Request() req: any) {
    const userId = req.user.id;
    return this.onboardingService.skipStep(userId);
  }

  @Put('jump-to-step')
  async jumpToStep(
    @Request() req: any,
    @Body() dto: JumpToStepDto
  ) {
    const userId = req.user.id;
    return this.onboardingService.jumpToStep(userId, dto.targetStep);
  }

  @Get('config/:accountType')
  async getConfig(@Param('accountType') accountType: AccountType) {
    return this.onboardingService.configService.getConfig(accountType);
  }
}