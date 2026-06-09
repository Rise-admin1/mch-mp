import { getEmailBranding } from '../utils/schedulingEmailBranding.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderEmailShell({ title, preheader, bodyHtml, brand }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${brand.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${brand.text};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${brand.background};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${brand.card};border:1px solid ${brand.border};border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(200,16,46,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg, ${brand.primary} 0%, ${brand.primaryDark} 100%);padding:28px 32px;text-align:center;">
              ${brand.logoUrl ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.name)}" width="72" height="72" style="display:block;margin:0 auto 12px;border-radius:12px;background:#fff;padding:8px;" />` : ''}
              <h1 style="margin:0;color:#ffffff;font-size:24px;line-height:1.3;font-weight:700;">${escapeHtml(brand.name)}</h1>
              <p style="margin:8px 0 0;color:#FFE4E6;font-size:14px;">Session package</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildSessionPackageGrantedEmail({
  sessionsGranted,
  totalRemaining,
  shareUrl,
  isTopUp,
  appSource,
}) {
  const brand = getEmailBranding(appSource);
  const sessionWord = sessionsGranted === 1 ? 'session' : 'sessions';
  const remainingWord = totalRemaining === 1 ? 'session' : 'sessions';
  const title = isTopUp ? 'Additional sessions added' : 'Your session package';
  const preheader = isTopUp
    ? `${sessionsGranted} more complimentary ${sessionWord} added to your account.`
    : `You have ${totalRemaining} complimentary ${remainingWord} ready to book.`;

  const bodyHtml = `
    <h2 style="margin:0 0 16px;font-size:22px;color:${brand.text};">${escapeHtml(title)}</h2>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${brand.muted};">
      ${
        isTopUp
          ? `${sessionsGranted} additional complimentary ${sessionWord} have been added to your account.`
          : `You have been granted ${sessionsGranted} complimentary ${sessionWord}.`
      }
      You now have <strong style="color:${brand.text};">${totalRemaining}</strong> ${remainingWord} available to book.
    </p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${brand.muted};">
      Use the link below to schedule your sessions one at a time. Your email address will be pre-filled on the booking page.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
      <tr>
        <td style="border-radius:12px;background:${brand.primary};">
          <a href="${escapeHtml(shareUrl)}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">
            Book a session
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:14px;line-height:1.6;color:${brand.muted};word-break:break-all;">
      Or copy this link:<br />
      <a href="${escapeHtml(shareUrl)}" style="color:${brand.primary};">${escapeHtml(shareUrl)}</a>
    </p>
  `;

  const text = [
    title,
    '',
    isTopUp
      ? `${sessionsGranted} additional complimentary ${sessionWord} have been added to your account.`
      : `You have been granted ${sessionsGranted} complimentary ${sessionWord}.`,
    `You now have ${totalRemaining} ${remainingWord} available to book.`,
    '',
    'Book a session:',
    shareUrl,
  ].join('\n');

  return {
    subject: isTopUp
      ? `${brand.name}: ${sessionsGranted} more session${sessionsGranted === 1 ? '' : 's'} added`
      : `${brand.name}: Your ${sessionsGranted}-session package`,
    html: renderEmailShell({ title, preheader, bodyHtml, brand }),
    text,
  };
}
