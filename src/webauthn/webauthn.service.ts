import { Injectable } from '@nestjs/common';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebAuthnChallenge } from './entities/webauthnChallenge.entity';

@Injectable()
export class WebauthnService {
  constructor(
    @InjectRepository(WebAuthnChallenge)
    private challengeRepo: Repository<WebAuthnChallenge>,
  ) {}

  async generateChallenge(userId: string) {
    const options = await generateAuthenticationOptions({
      rpID: 'localhost', // Replace with your actual RP ID (e.g., your domain)
      timeout: 60000,
      userVerification: 'preferred',
    });

    await this.challengeRepo.save({
      userId,
      challenge: options.challenge,
    });

    return options;
  }

  async verifyChallenge(
    userId: string,
    expectedChallenge: string,
    credential: any,
    expectedOrigin: string,
    expectedRPID: string,
  ) {
    const credentialPublicKey = Buffer.from(credential.publicKey, 'base64url');
    const credentialID = Buffer.from(credential.rawId, 'base64url');

    const authenticator = {
      id: credential.id, // Add the missing id property
      publicKey: new Uint8Array(credentialPublicKey), // Add the missing publicKey property
      credentialPublicKey,
      credentialID,
      counter: 0,
    };

    const result = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
      credential: authenticator,
    });

    return result;
  }
}
