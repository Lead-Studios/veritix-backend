import { Injectable, Logger } from "@nestjs/common"
import type { SchedulerRegistry } from "@nestjs/schedule"
import { CronJob } from "cron"

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name)

  constructor(private schedulerRegistry: SchedulerRegistry) {}

  /**
   * Adds a new CRON job to the scheduler.
   * @param name Unique name for the job.
   * @param cronTime CRON expression or Date object for scheduling.
   * @param callback Function to execute when the job runs.
   */
  addCronJob(name: string, cronTime: Date, callback: () => void) {
    // Ensure cronTime is in UTC for consistency
    const job = new CronJob(cronTime, callback, null, true, "UTC")

    this.schedulerRegistry.addCronJob(name, job)
    this.logger.debug(`Job ${name} scheduled for ${cronTime.toISOString()}`)
  }

  /**
   * Deletes a CRON job from the scheduler.
   * @param name Name of the job to delete.
   */
  deleteCronJob(name: string) {
    try {
      this.schedulerRegistry.deleteCronJob(name)
      this.logger.debug(`Job ${name} deleted!`)
    } catch (e) {
      this.logger.warn(`Job ${name} not found or could not be deleted: ${e.message}`)
    }
  }

  /**
   * Retrieves a CRON job by name.
   * @param name Name of the job.
   * @returns The CronJob instance.
   */
  getCronJob(name: string): CronJob {
    return this.schedulerRegistry.getCronJob(name)
  }

  /**
   * Lists all active CRON jobs.
   * @returns A map of job names to CronJob instances.
   */
  getJobs(): Map<string, CronJob> {
    return this.schedulerRegistry.getCronJobs()
  }
}
