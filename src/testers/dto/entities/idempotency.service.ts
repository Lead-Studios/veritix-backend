import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IdempotencyKey } from "./idempotency.entity";
import * as crypto from "crypto";

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyKey)
    private idempotencyRepo: Repository<IdempotencyKey>,
  ) {}

  hashRequest(method: string, url: string, body: any): string {
    const content = JSON.stringify({ method, url, body });
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  async findByKey(key: string): Promise<IdempotencyKey | null> {
    return this.idempotencyRepo.findOne({
      where: { key },
    });
  }

  async store(
    key: string,
    requestHash: string,
    response: any,
    statusCode: number,
    ttlHours: number = 24,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    await this.idempotencyRepo.save({
      key,
      requestHash,
      response,
      statusCode,
      expiresAt,
    });
  }

  async cleanup(): Promise<void> {
    await this.idempotencyRepo
      .createQueryBuilder()
      .delete()
      .where("expiresAt < :now", { now: new Date() })
      .execute();
  }
}
