/**
 * MCQ Ventures — Email Notification Service
 * Transactional email via AWS SES.
 *
 * Design:
 *   - Uses AWS SDK v3 SESv2Client (lighter than v2 SES)
 *   - From address injected from SES_FROM_ADDRESS env var
 *   - Non-blocking: caller fire-and-forgets; errors are logged, not thrown
 *   - All sends are logged to console with correlation ID for tracing
 *
 * SES Setup:
 *   1. Verify sending domain in AWS SES console (mcqventures.com)
 *   2. Move out of SES sandbox for production sends
 *   3. Set SES_FROM_ADDRESS=notifications@mcqventures.com in Secrets Manager
 */

import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
} from '@aws-sdk/client-sesv2';
import { randomUUID } from 'crypto';

let sesClient: SESv2Client | null = null;

function getClient(): SESv2Client {
  if (!sesClient) {
    sesClient = new SESv2Client({
      region: process.env.SES_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
    });
  }
  return sesClient;
}

export interface EmailPayload {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
}

/**
 * Send a transactional email via SES.
 * Fire-and-forget safe — errors are logged, never thrown.
 * Returns correlation ID for log tracing.
 */
export async function sendEmail(payload: EmailPayload): Promise<string> {
  const correlationId = randomUUID();
  const fromAddress = process.env.SES_FROM_ADDRESS;

  if (!fromAddress) {
    console.error(`[EmailService:${correlationId}] SES_FROM_ADDRESS not set — email suppressed`);
    return correlationId;
  }

  const input: SendEmailCommandInput = {
    FromEmailAddress: fromAddress,
    Destination: { ToAddresses: [payload.to] },
    Content: {
      Simple: {
        Subject: { Data: payload.subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: payload.bodyText, Charset: 'UTF-8' },
          Html: { Data: payload.bodyHtml, Charset: 'UTF-8' },
        },
      },
    },
  };

  try {
    const result = await getClient().send(new SendEmailCommand(input));
    console.info(
      `[EmailService:${correlationId}] Sent to ${payload.to} — MessageId: ${result.MessageId}`
    );
  } catch (err) {
    console.error(`[EmailService:${correlationId}] SES send failed:`, err);
  }

  return correlationId;
}
