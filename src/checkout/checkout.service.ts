// src/checkout/checkout.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CheckoutSession } from './entities/checkout-session.entity';
import { StartCheckoutDto } from './dto/start-checkout.dto';

@Injectable()
export class CheckoutService {
  constructor(
    @InjectRepository(CheckoutSession)
    private checkoutRepo: Repository<CheckoutSession>,
  ) {}

  async startCheckout(dto: StartCheckoutDto) {
    const session = this.checkoutRepo.create({
      sessionId: dto.sessionId,
      userId: dto.userId,
      startedAt: new Date(),
      completed: false,
    });

    return this.checkoutRepo.save(session);
  }

  async completeCheckout(sessionId: string) {
    const session = await this.checkoutRepo.findOneBy({ sessionId });
    if (!session) return null;

    session.completed = true;
    session.completedAt = new Date();

    return this.checkoutRepo.save(session);
  }

  async getDropoffRate() {
    const total = await this.checkoutRepo.count();
    const completed = await this.checkoutRepo.count({
      where: { completed: true },
    });

    const dropOff = total - completed;
    const dropOffRate = total > 0 ? (dropOff / total) * 100 : 0;

    return {
      totalSessions: total,
      completedSessions: completed,
      dropOffSessions: dropOff,
      dropOffRate: dropOffRate.toFixed(2) + '%',
    };
  }
}
