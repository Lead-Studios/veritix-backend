// src/activity-log/activity-log.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ActivityLog } from "./entity/activity-log.entity";

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepo: Repository<ActivityLog>,
  ) {}

  async logActivity(
    userId: number,
    type: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    const activity = this.activityLogRepo.create({
      userId,
      type,
      metadata,
    });
    await this.activityLogRepo.save(activity);
  }
}
