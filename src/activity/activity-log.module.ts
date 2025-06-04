// src/activity-log/activity-log.module.ts
import { Module, Global } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActivityLog } from "./entity/activity-log.entity";
import { ActivityLogService } from "./activity-log.service";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog])],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
