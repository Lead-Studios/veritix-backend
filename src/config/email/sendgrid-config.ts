import 'dotenv/config';
import * as sgMail from '@sendgrid/mail';

type SendGridConfig = {
  client: typeof sgMail;
  sender: string;
};

export function getSendGridConfig(): SendGridConfig | null {
  const { SENDGRID_API_KEY, SENDGRID_SENDER } = process.env;

  if (!SENDGRID_API_KEY || !SENDGRID_SENDER) {
    return null; // Email disabled (dev / wave 1)
  }

  sgMail.setApiKey(SENDGRID_API_KEY);

  return {
    client: sgMail,
    sender: SENDGRID_SENDER,
  };
}
