import { Module, type OnModuleInit } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ScheduleModule as NestScheduleModule } from "@nestjs/schedule"
import { ReminderController } from "./controllers/reminder.controller"
import { ReminderService } from "./services/reminder.service"
import { ReminderSchedulerService } from "./services/reminder-scheduler.service"
import { NotificationService } from "./services/notification.service"
import { EventService } from "./services/event.service" // Mock Event Service
import { Reminder } from "./entities/reminder.entity"

@Module({
  imports: [
    TypeOrmModule.forFeature([Reminder]),
    NestScheduleModule.forRoot(), // Import NestJS Schedule module globally
  ],
  controllers: [ReminderController],
  providers: [ReminderService, ReminderSchedulerService, NotificationService, EventService],
  exports: [ReminderService], // Export if other modules need to interact with it
})
export class ReminderModule implements OnModuleInit {
  constructor(private readonly reminderService: ReminderService) {}

  // This method is called once the host module has been initialized.
  // It's used here to re-schedule any active jobs after application startup.
  async onModuleInit() {
    await this.reminderService.onModuleInit()
  }
}
