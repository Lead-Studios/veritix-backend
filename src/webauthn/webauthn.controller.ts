/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Body, Controller, Post } from '@nestjs/common';
import { WebauthnService } from './webauthn.service';

@Controller('auth/webauthn')
export class WebauthnController {
  constructor(private readonly webauthnService: WebauthnService) {}

  @Post('generate-challenge')
  async generate(@Body('userId') userId: string) {
    return this.webauthnService.generateChallenge(userId);
  }

  @Post('verify')
  async verify(@Body() body: any) {
    const { userId, credential, expectedOrigin, expectedRPID } = body;

    // Fetch last challenge for the user
    const challenge = await this.webauthnService['challengeRepo'].findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!challenge) {
      return { verified: false, error: 'No challenge found for user' };
    }

    const result = await this.webauthnService.verifyChallenge(
      userId,
      challenge.challenge,
      credential,
      expectedOrigin,
      expectedRPID,
    );

    return { verified: result.verified };
  }
}
