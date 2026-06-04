const BRAND = {
  name: 'PhD Success AE',
  primary: '#C8102E',
  primaryDark: '#9B0C24',
  accent: '#E53935',
  background: '#FFF5F5',
  card: '#FFFFFF',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#FECACA',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMeetingDateTime(startTime, endTime) {
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  const end = endTime instanceof Date ? endTime : new Date(endTime);

  const datePart = start.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const startPart = start.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  const endPart = end.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  return {
    dateLine: `${datePart} (UTC)`,
    timeLine: `${startPart} – ${endPart} UTC`,
    isoStart: start.toISOString(),
    isoEnd: end.toISOString(),
  };
}

function renderEmailShell({ title, preheader, bodyHtml, logoUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.text};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.background};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(200,16,46,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%);padding:28px 32px;text-align:center;">
              ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(BRAND.name)}" width="72" height="72" style="display:block;margin:0 auto 12px;border-radius:12px;background:#fff;padding:8px;" />` : ''}
              <h1 style="margin:0;color:#ffffff;font-size:24px;line-height:1.3;font-weight:700;">${escapeHtml(BRAND.name)}</h1>
              <p style="margin:8px 0 0;color:#FFE4E6;font-size:14px;">Scheduling</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${BRAND.border};background:#FFF9F9;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.muted};text-align:center;">
                This message was sent by ${escapeHtml(BRAND.name)} scheduling.<br />
                Please do not reply directly to this automated email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailRow(label, value) {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};width:120px;vertical-align:top;">
        <span style="font-size:13px;font-weight:600;color:${BRAND.muted};">${escapeHtml(label)}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.text};">
        ${value}
      </td>
    </tr>`;
}

function renderButton(href, label) {
  if (!href) return '';
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto 0;">
      <tr>
        <td style="border-radius:10px;background:${BRAND.primary};">
          <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 24px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

export function buildMeetingScheduledEmail({
  clientName,
  clientEmail,
  startTime,
  endTime,
  meetLink,
  bookingId,
  logoUrl,
  notes,
  attachmentNames = [],
}) {
  const { dateLine, timeLine } = formatMeetingDateTime(startTime, endTime);
  const subject = `Meeting scheduled: ${clientName} — ${dateLine}`;

  const bodyHtml = `
    <h2 style="margin:0 0 12px;font-size:22px;color:${BRAND.primaryDark};">Session confirmed</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.text};">
      A 1-hour ${escapeHtml(BRAND.name)} session has been booked and added to Google Calendar.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.background};border:1px solid ${BRAND.border};border-radius:12px;padding:4px 16px;margin-bottom:8px;">
      ${detailRow('Client', escapeHtml(clientName))}
      ${detailRow('Email', escapeHtml(clientEmail))}
      ${detailRow('Date', escapeHtml(dateLine))}
      ${detailRow('Time', escapeHtml(timeLine))}
      ${detailRow('Format', 'Google Meet (video call)')}
      ${notes ? detailRow('Notes', escapeHtml(notes)) : ''}
      ${attachmentNames.length ? detailRow('Files', escapeHtml(attachmentNames.join(', '))) : ''}
      ${detailRow('Booking ID', `<code style="font-size:12px;color:${BRAND.primaryDark};">${escapeHtml(bookingId)}</code>`)}
    </table>

    ${attachmentNames.length ? `
    <div style="margin-top:24px;padding:16px;border-left:4px solid ${BRAND.primary};background:#FFF1F2;border-radius:8px;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${BRAND.primaryDark};">Client files attached</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:${BRAND.text};">
        The client uploaded ${attachmentNames.length === 1 ? 'a file' : `${attachmentNames.length} files`} with their booking. See the email attachment${attachmentNames.length === 1 ? '' : 's'}.
      </p>
    </div>` : ''}

    <div style="margin-top:24px;padding:16px;border-left:4px solid ${BRAND.primary};background:#FFF1F2;border-radius:8px;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${BRAND.primaryDark};">Google Calendar</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:${BRAND.text};">
        The client receives a Google Calendar invite separately. Use the Meet link below to join the session.
      </p>
    </div>

    ${meetLink ? renderButton(meetLink, 'Open Google Meet') : ''}`;

  const html = renderEmailShell({
    title: subject,
    preheader: `${clientName} — ${dateLine} at ${timeLine}`,
    bodyHtml,
    logoUrl,
  });

  const text = [
    `${BRAND.name} session confirmed`,
    '',
    `Client: ${clientName}`,
    `Email: ${clientEmail}`,
    `Date: ${dateLine}`,
    `Time: ${timeLine}`,
    notes ? `Notes: ${notes}` : '',
    attachmentNames.length ? `Files: ${attachmentNames.join(', ')}` : '',
    meetLink ? `Google Meet: ${meetLink}` : '',
    `Booking ID: ${bookingId}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text };
}

export function buildMeetingCancelledEmail({
  clientName,
  clientEmail,
  startTime,
  endTime,
  bookingId,
  logoUrl,
}) {
  const { dateLine, timeLine } = formatMeetingDateTime(startTime, endTime);
  const subject = `Meeting cancelled: ${clientName} — ${dateLine}`;

  const bodyHtml = `
    <h2 style="margin:0 0 12px;font-size:22px;color:${BRAND.primaryDark};">Session cancelled</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.text};">
      The following ${escapeHtml(BRAND.name)} session has been cancelled. The Google Calendar event has been removed and attendees were notified.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.background};border:1px solid ${BRAND.border};border-radius:12px;padding:4px 16px;margin-bottom:8px;">
      ${detailRow('Client', escapeHtml(clientName))}
      ${detailRow('Email', escapeHtml(clientEmail))}
      ${detailRow('Date', escapeHtml(dateLine))}
      ${detailRow('Time', escapeHtml(timeLine))}
      ${detailRow('Booking ID', `<code style="font-size:12px;color:${BRAND.primaryDark};">${escapeHtml(bookingId)}</code>`)}
    </table>`;

  const html = renderEmailShell({
    title: subject,
    preheader: `Session on ${dateLine} was cancelled.`,
    bodyHtml,
    logoUrl,
  });

  const text = [
    `${BRAND.name} session cancelled`,
    '',
    `Client: ${clientName}`,
    `Email: ${clientEmail}`,
    `Date: ${dateLine}`,
    `Time: ${timeLine}`,
    `Booking ID: ${bookingId}`,
  ].join('\n');

  return { subject, html, text };
}

export function buildMeetingRescheduledEmail({
  clientName,
  clientEmail,
  previousStartTime,
  previousEndTime,
  startTime,
  endTime,
  meetLink,
  bookingId,
  logoUrl,
}) {
  const previous = formatMeetingDateTime(previousStartTime, previousEndTime);
  const updated = formatMeetingDateTime(startTime, endTime);
  const subject = `Meeting rescheduled: ${clientName} — ${updated.dateLine}`;

  const bodyHtml = `
    <h2 style="margin:0 0 12px;font-size:22px;color:${BRAND.primaryDark};">Session rescheduled</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.text};">
      A ${escapeHtml(BRAND.name)} session has been moved to a new time. The Google Calendar event was updated and attendees were notified.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.background};border:1px solid ${BRAND.border};border-radius:12px;padding:4px 16px;margin-bottom:8px;">
      ${detailRow('Client', escapeHtml(clientName))}
      ${detailRow('Email', escapeHtml(clientEmail))}
      ${detailRow('Previous', `${escapeHtml(previous.dateLine)}<br /><span style="color:${BRAND.muted};">${escapeHtml(previous.timeLine)}</span>`)}
      ${detailRow('New date', escapeHtml(updated.dateLine))}
      ${detailRow('New time', escapeHtml(updated.timeLine))}
      ${detailRow('Booking ID', `<code style="font-size:12px;color:${BRAND.primaryDark};">${escapeHtml(bookingId)}</code>`)}
    </table>

    ${meetLink ? renderButton(meetLink, 'Open Google Meet') : ''}`;

  const html = renderEmailShell({
    title: subject,
    preheader: `Moved from ${previous.dateLine} to ${updated.dateLine}.`,
    bodyHtml,
    logoUrl,
  });

  const text = [
    `${BRAND.name} session rescheduled`,
    '',
    `Client: ${clientName}`,
    `Email: ${clientEmail}`,
    `Previous: ${previous.dateLine} ${previous.timeLine}`,
    `New: ${updated.dateLine} ${updated.timeLine}`,
    meetLink ? `Google Meet: ${meetLink}` : '',
    `Booking ID: ${bookingId}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text };
}
