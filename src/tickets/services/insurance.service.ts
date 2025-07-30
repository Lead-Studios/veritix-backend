import { Injectable, Logger } from '@nestjs/common';
import { TicketingTicket, InsuranceStatus } from '../../ticketing/entities/ticket.entity';

@Injectable()
export class InsuranceService {
  private readonly logger = new Logger(InsuranceService.name);

  /**
   * Simulates requesting insurance for a ticket.
   * In a real scenario, this would involve an API call to an insurance provider.
   * @param ticket The ticket for which insurance is being requested.
   * @returns A promise that resolves with the insurance ID and status.
   */
  async requestInsurance(ticket: TicketingTicket): Promise<{
    insuranceId: string;
    insuranceStatus: InsuranceStatus;
  }> {
    this.logger.log(`Requesting insurance for ticket ${ticket.id} (Purchaser: ${ticket.purchaserEmail})`);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate success or failure
    const isSuccess = Math.random() > 0.1; // 90% success rate

    if (isSuccess) {
      const insuranceId = `INS-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      this.logger.log(`Insurance approved for ticket ${ticket.id}. Insurance ID: ${insuranceId}`);
      return {
        insuranceId,
        insuranceStatus: InsuranceStatus.APPROVED,
      };
    } else {
      this.logger.warn(`Insurance rejected for ticket ${ticket.id}.`);
      return {
        insuranceId: null,
        insuranceStatus: InsuranceStatus.REJECTED,
      };
    }
  }

  /**
   * Simulates checking the status of an insurance policy.
   * @param insuranceId The ID of the insurance policy.
   * @returns A promise that resolves with the current insurance status.
   */
  async checkInsuranceStatus(insuranceId: string): Promise<InsuranceStatus> {
    this.logger.log(`Checking status for insurance ID: ${insuranceId}`);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // In a real scenario, this would query the insurance provider's API.
    // For mock, we'll just return a random status for demonstration.
    const statuses = [InsuranceStatus.APPROVED, InsuranceStatus.PENDING, InsuranceStatus.REJECTED, InsuranceStatus.CLAIMED];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }
}
