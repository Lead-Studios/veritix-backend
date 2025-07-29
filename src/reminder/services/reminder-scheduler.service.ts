import { Injectable, Logger } from "@nestjs/common"
import type { SchedulerRegistry } from "@nestjs/schedule"
import { CronJob } from "cron"
import { type Reminder, ReminderStatus, ReminderType } from "../entities/reminder.entity"
import type { NotificationService } from "./notification.service"
import type { EventService } from "./event.service"

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name)

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private notificationService: NotificationService,
    private eventService: EventService,
  ) {}

  /**
   * Schedules a CRON job for a given reminder.
   * @param reminder The Reminder entity to schedule.
   * @param updateReminderStatusCallback A callback to update the reminder's status in the database.
   */
  async scheduleReminder(
    reminder: Reminder,
    updateReminderStatusCallback: (id: string, status: ReminderStatus, triggeredAt?: Date) => Promise<void>,
  ) {
    const jobName = `reminder-${reminder.id}`

    // First, ensure any existing job for this reminder is removed
    this.cancelReminder(reminder.id)

    try {
      const eventStartTime = await this.eventService.getEventStartTime(reminder.eventId)
      const triggerTime = new Date(eventStartTime.getTime() - reminder.offsetMinutes * 60 * 1000)

      if (triggerTime <= new Date()) {
        this.logger.warn(
          `Reminder ${reminder.id} for event ${reminder.eventId} has a trigger time in the past or immediate future (${triggerTime.toISOString()}). It will be processed immediately if active.`,
        )
        // If the time is in the past, trigger immediately (or mark as failed if it's too old)
        if (eventStartTime.getTime() - Date.now() < -(reminder.offsetMinutes * 60 * 1000) - 5 * 60 * 1000) {
          // 5 minutes grace period
          await updateReminderStatusCallback(reminder.id, ReminderStatus.FAILED)
          this.logger.error(
            `Reminder ${reminder.id} for event ${reminder.eventId} is too far in the past to trigger. Marking as FAILED.`,
          )
          return
        }
        // For immediate or slightly past triggers, run the job logic directly
        this.logger.log(`Triggering reminder ${reminder.id} immediately as its time is in the past or very near.`)
        await this.executeReminderJob(reminder, updateReminderStatusCallback)
        return
      }

      const job = new CronJob(
        triggerTime,
        async () => {
          await this.executeReminderJob(reminder, updateReminderStatusCallback)
        },
        null,
        true,
        "UTC",
      ) // Run in UTC

      this.schedulerRegistry.addCronJob(jobName, job)
      this.logger.log(
        `Reminder ${reminder.id} for event ${reminder.eventId} scheduled for ${triggerTime.toISOString()}`,
      )
    } catch (error) {
      this.logger.error(
        `Failed to schedule reminder ${reminder.id} for event ${reminder.eventId}: ${error.message}`,
        error.stack,
      )
      await updateReminderStatusCallback(reminder.id, ReminderStatus.FAILED)
    }
  }

  /**
   * Cancels a scheduled reminder job.
   * @param reminderId The ID of the reminder to cancel.
   */
  cancelReminder(reminderId: string) {
    const jobName = `reminder-${reminderId}`
    try {
      if (this.schedulerRegistry.doesExist("cron", jobName)) {
        this.schedulerRegistry.deleteCronJob(jobName)
        this.logger.log(`Cancelled reminder job: ${jobName}`)
      }
    } catch (e) {
      this.logger.warn(`Could not cancel reminder job ${jobName}: ${e.message}`)
    }
  }

  /**
   * Executes the logic for a reminder job.
   * @param reminder The Reminder entity.
   * @param updateReminderStatusCallback A callback to update the reminder's status in the database.
   */
  private async executeReminderJob(
    reminder: Reminder,
    updateReminderStatusCallback: (id: string, status: ReminderStatus, triggeredAt?: Date) => Promise<void>,
  ) {
    this.logger.log(`Triggering reminder ${reminder.id} for event ${reminder.eventId} (Type: ${reminder.type})`)

    try {
      const eventDetails = await this.eventService.getEventDetails(reminder.eventId)
      const eventName = eventDetails.name
      const eventTime = eventDetails.startTime.toLocaleString("en-US", {
        timeZone: "UTC",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      const offsetHours = reminder.offsetMinutes / 60

      // Replace placeholders in message template
      let message = reminder.messageTemplate
      message = message.replace(/{eventName}/g, eventName)
      message = message.replace(/{eventTime}/g, eventTime)
      message = message.replace(/{offsetMinutes}/g, reminder.offsetMinutes.toString())
      message = message.replace(/{offsetHours}/g, offsetHours.toString())

      // Determine recipients based on reminder type and event attendees
      // For simplicity, we'll use a mock recipient. In a real app, you'd fetch attendees' emails/tokens/phone numbers.
      let recipient: string
      switch (reminder.type) {
        case ReminderType.EMAIL:
          recipient = "attendee@example.com" // Replace with actual attendee email
          break
        case ReminderType.PUSH:
          recipient = "attendee-push-token-123" // Replace with actual attendee push token
          break
        case ReminderType.SMS:
          recipient = "+15551234567" // Replace with actual attendee phone number
          break
        default:
          throw new Error(`Unsupported reminder type: ${reminder.type}`)
      }

      const success = await this.notificationService.sendNotification(
        reminder.type,
        recipient,
        reminder.subject || `Reminder for ${eventName}`,
        message,
        { eventId: reminder.eventId, reminderId: reminder.id }, // Additional data for push
      )

      if (success) {
        await updateReminderStatusCallback(reminder.id, ReminderStatus.TRIGGERED, new Date())
        this.logger.log(`Reminder ${reminder.id} successfully triggered and sent.`)
      } else {
        await updateReminderStatusCallback(reminder.id, ReminderStatus.FAILED)
        this.logger.error(`Reminder ${reminder.id} failed to send notification.`)
      }
    } catch (error) {
      this.logger.error(
        `Error during reminder ${reminder.id} execution for event ${reminder.eventId}: ${error.message}`,
        error.stack,
      )
      await updateReminderStatusCallback(reminder.id, ReminderStatus.FAILED)
    } finally {
      // For one-time reminders, delete the job after execution
      this.cancelReminder(reminder.id)
    }
  }
}
