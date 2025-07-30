// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { WebauthnService } from './webauthn.service';
import { WebauthnController } from './webauthn.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebAuthnChallenge } from './entities/webauthnChallenge.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WebAuthnChallenge])],
  controllers: [WebauthnController],
  providers: [WebauthnService],
})
export class AuthModule {}
