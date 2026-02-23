import * as path from 'path';
import * as fs from 'fs';
import { getSendGridConfig } from './sendgrid-config';

/* ----------------------------------------
 * Template loading
 * ------------------------------------- */

export async function loadHtmlTemplate(templateName: string): Promise<string> {
  const possiblePaths = [
    path.resolve(
      process.cwd(),
      'src/config/email/email-templates',
      `${templateName}.html`,
    ),
    path.resolve(
      process.cwd(),
      'dist/config/email/email-templates',
      `${templateName}.html`,
    ),
  ];

  for (const p of possiblePaths) {
    try {
      await fs.promises.access(p, fs.constants.F_OK);
      const content = await fs.promises.readFile(p, 'utf8');

      if (!content.trim()) {
        throw new Error(`Template "${templateName}" is empty.`);
      }

      return content;
    } catch {
      // try next path
    }
  }

  throw new Error(`Template "${templateName}" not found in src/ or dist/`);
}

/* ----------------------------------------
 * Template placeholder replacement
 * ------------------------------------- */

export function replacePlaceholders(
  template: string,
  placeholders: Record<string, string>,
): string {
  let content = template;

  for (const [key, value] of Object.entries(placeholders)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(regex, value);
  }

  return content;
}

/* ----------------------------------------
 * Email sending (SendGrid OR mock)
 * ------------------------------------- */

export async function sendEmail(
  to: string,
  subject: string,
  templateName: string,
  placeholders: Record<string, string>,
) {
  const template = await loadHtmlTemplate(templateName);
  const htmlContent = replacePlaceholders(template, placeholders);

  const sendGrid = getSendGridConfig();

  // ✅ MOCK MODE (Wave 1 / Dev)
  if (!sendGrid) {
    console.log('[EMAIL MOCK]', {
      to,
      subject,
      template: templateName,
      placeholders,
    });

    return {
      success: true,
      mocked: true,
      message: `Mock email generated for ${to}`,
    };
  }

  // ✅ REAL SENDGRID MODE
  try {
    await sendGrid.client.send({
      to,
      from: sendGrid.sender,
      subject,
      html: htmlContent,
    });

    return {
      success: true,
      mocked: false,
      message: `Email sent to ${to}`,
    };
  } catch (error: any) {
    console.error(
      'SendGrid email error:',
      error?.response?.body || error?.message || error,
    );

    return {
      success: false,
      error,
    };
  }
}
