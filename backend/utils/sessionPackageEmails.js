import { buildSessionPackageGrantedEmail } from '../templates/sessionPackageEmail.js';
import { isResendConfigured, sendEmail } from './resend.js';

export async function sendSessionPackageGrantedEmail({
  email,
  sessionsGranted,
  totalRemaining,
  shareUrl,
  isTopUp,
  appSource,
}) {
  if (!isResendConfigured(appSource)) {
    console.warn(`Resend not configured for ${appSource}. Skipping session package email.`);
    return { skipped: true, emailSent: false };
  }

  const content = buildSessionPackageGrantedEmail({
    sessionsGranted,
    totalRemaining,
    shareUrl,
    isTopUp,
    appSource,
  });

  const result = await sendEmail({
    to: email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    appSource,
  });

  return { skipped: result.skipped, emailSent: !result.skipped, id: result.id || null };
}
