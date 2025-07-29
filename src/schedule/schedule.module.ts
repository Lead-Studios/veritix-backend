import { Module, type OnModuleInit } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ScheduleModule as NestScheduleModule } from "@nestjs/schedule"
import { ScheduledEventController } from "./controllers/scheduled-event.controller"
import { ScheduledEventService } from "./services/scheduled-event.service"
import { SchedulerService } from "./services/scheduler.service"
import { EventPublisherService } from "./services/event-publisher.service"
import { ScheduledEvent } from "./entities/scheduled-event.entity"

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledEvent]),
    NestScheduleModule.forRoot(), // Import NestJS Schedule module
  ],
  controllers: [ScheduledEventController],
  providers: [ScheduledEventService, SchedulerService, EventPublisherService],
  exports: [ScheduledEventService], // Export if other modules need to interact with it
})
export class ScheduleModule implements OnModuleInit {
  constructor(private readonly scheduledEventService: ScheduledEventService) {}

  // This method is called once the host module has been initialized.
  // It's used here to re-schedule any pending jobs after application startup.
  async onModuleInit() {
    await this.scheduledEventService.onApplicationBootstrap()
  }
}
