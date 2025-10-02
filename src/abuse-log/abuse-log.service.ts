import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbuseLog } from './abuse-log.entity';

@Injectable()
export class AbuseLogService {
  constructor(
    @InjectRepository(AbuseLog)
    private readonly abuseLogRepo: Repository<AbuseLog>,
  ) {}

  async log(endpoint: string, ip: string, reason: string) {
    const log = this.abuseLogRepo.create({ endpoint, ip, reason });
    return this.abuseLogRepo.save(log);
  }
}
