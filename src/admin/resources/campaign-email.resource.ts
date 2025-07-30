import { CampaignEmail } from '../entities/campaign-email.entity';

export class CampaignEmailResource {
  static toResponse(email: CampaignEmail) {
    return {
      id: email.id,
      subject: email.subject,
      body: email.body,
      recipients: email.recipients,
      status: email.status,
      createdAt: email.createdAt,
      updatedAt: email.updatedAt,
    };
  }

  static toArray(emails: CampaignEmail[]) {
    return emails.map(CampaignEmailResource.toResponse);
  }
}
