import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { NotificationService } from "./notification.service";

@Processor("notification")
export class NotificationProcessor {
  constructor(private notificationService: NotificationService) {}

  @Process("ticket-available")
  async handleTicketAvailable(job: Job) {
    const { email, eventName, userId } = job.data;

    try {
      await this.notificationService.sendTicketAvailableEmail(
        email,
        eventName,
        userId,
      );
      console.log(`Notification sent to ${email} for event ${eventName}`);
    } catch (error) {
      console.error("Failed to process notification job:", error);
      throw error; // This will trigger retry
    }
  }
}
