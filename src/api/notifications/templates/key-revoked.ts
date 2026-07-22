/**
 * MCQ Ventures — Key Revocation Email Template
 * Generates subject, plain-text, and HTML bodies for KEY_REVOKED notifications.
 * Tone varies by revocation source.
 */

import type { RevocationSource } from '../../credentials/revocation.service';

export interface KeyRevokedTemplateInput {
  keyPrefix: string;       // e.g. MCQ_ENT — safe to display, never the raw key
  tier: string;            // ENT | PRO | OPS
  source: RevocationSource;
  reason?: string;
  supportEmail?: string;
}

export interface EmailTemplate {
  subject: string;
  bodyText: string;
  bodyHtml: string;
}

const SOURCE_LABEL: Record<RevocationSource, string> = {
  user: 'your request',
  admin: 'an administrative action by MCQ Ventures',
  'github-scanner': 'an automated security alert from GitHub Secret Scanning',
};

const SOURCE_ACTION_TEXT: Record<RevocationSource, string> = {
  user: 'You initiated this revocation.',
  admin:
    'Our security team identified a policy violation or account action that required this revocation. Please contact support if you believe this is in error.',
  'github-scanner':
    'GitHub detected your API key in a public repository or commit. The key was immediately revoked to protect your account. You should rotate any related credentials and audit your recent commits.',
};

export function buildKeyRevokedEmail(
  input: KeyRevokedTemplateInput
): EmailTemplate {
  const support = input.supportEmail ?? 'support@mcqventures.com';
  const label = SOURCE_LABEL[input.source];
  const actionText = SOURCE_ACTION_TEXT[input.source];
  const reasonLine = input.reason ? `\nReason: ${input.reason}` : '';

  const subject =
    input.source === 'github-scanner'
      ? `⚠️ Security Alert — MCQ API Key Revoked (${input.keyPrefix})`
      : `MCQ Ventures — API Key Revoked (${input.keyPrefix})`;

  const bodyText = [
    `MCQ Ventures — API Key Revocation Notice`,
    ``,
    `Your API key ${input.keyPrefix} (${input.tier} tier) has been revoked due to ${label}.`,
    ``,
    actionText,
    reasonLine,
    ``,
    `What to do next:`,
    `  1. Log in to your MCQ dashboard to issue a replacement key.`,
    `  2. Update your integration with the new key.`,
    `  3. If you did not initiate this action, contact ${support} immediately.`,
    ``,
    `This is an automated security notification.`,
    `MCQ Ventures — governance-first. regulator-ready.`,
  ]
    .join('\n')
    .trim();

  const bodyHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>API Key Revoked</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
  <div style="border-left: 4px solid ${input.source === 'github-scanner' ? '#dc2626' : '#2563eb'}; padding-left: 16px; margin-bottom: 24px;">
    <h2 style="margin: 0 0 4px;">${input.source === 'github-scanner' ? '⚠️ Security Alert — ' : ''}API Key Revoked</h2>
    <p style="margin: 0; color: #6b7280; font-size: 14px;">MCQ Ventures Credential Management</p>
  </div>

  <p>Your API key <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${input.keyPrefix}</code> (<strong>${input.tier} tier</strong>) has been revoked due to <strong>${label}</strong>.</p>

  <p>${actionText}</p>

  ${input.reason ? `<p style="color:#6b7280;font-size:14px;">Reason: ${input.reason}</p>` : ''}

  <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:24px 0;">
    <strong>Next steps:</strong>
    <ol style="margin:8px 0 0;padding-left:20px;">
      <li>Log in to your MCQ dashboard to issue a replacement key.</li>
      <li>Update your integration with the new key.</li>
      <li>If you did not initiate this action, contact <a href="mailto:${support}">${support}</a> immediately.</li>
    </ol>
  </div>

  <p style="color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;padding-top:16px;margin-top:32px;">
    This is an automated security notification from MCQ Ventures.<br>
    MCQ Ventures · Governance-first. Regulator-ready. Built to last.
  </p>
</body>
</html>`;

  return { subject, bodyText, bodyHtml };
}
