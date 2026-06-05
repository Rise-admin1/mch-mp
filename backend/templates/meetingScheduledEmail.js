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
              <p style="margin:8px 0 0;color:#FFE4E6;font-size:14px;">Scheduling</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${brand.border};background:#FFF9F9;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${brand.muted};text-align:center;">
                This message was sent by ${escapeHtml(brand.name)} scheduling.<br />
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

function detailRow(brand, label, value) {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${brand.border};width:120px;vertical-align:top;">
        <span style="font-size:13px;font-weight:600;color:${brand.muted};">${escapeHtml(label)}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid ${brand.border};font-size:14px;color:${brand.text};">
        ${value}
      </td>
    </tr>`;
}

function renderButton(brand, href, label) {
  if (!href) return '';
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto 0;">
      <tr>
        <td style="border-radius:10px;background:${brand.primary};">
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
  brand,
  notes,
  attachmentNames = [],
}) {
  const { dateLine, timeLine } = formatMeetingDateTime(startTime, endTime);
  const subject = `Meeting scheduled: ${clientName} — ${dateLine}`;

  const bodyHtml = `
    <h2 style="margin:0 0 12px;font-size:22px;color:${brand.primaryDark};">Session confirmed</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${brand.text};">
      A 1-hour ${escapeHtml(brand.name)} session has been booked and added to Google Calendar.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${brand.background};border:1px solid ${brand.border};border-radius:12px;padding:4px 16px;margin-bottom:8px;">
      ${detailRow(brand, 'Client', escapeHtml(clientName))}
      ${detailRow(brand, 'Email', escapeHtml(clientEmail))}
      ${detailRow(brand, 'Date', escapeHtml(dateLine))}
      ${detailRow(brand, 'Time', escapeHtml(timeLine))}
      ${detailRow(brand, 'Format', 'Google Meet (video call)')}
      ${notes ? detailRow(brand, 'Notes', escapeHtml(notes)) : ''}
      ${attachmentNames.length ? detailRow(brand, 'Files', escapeHtml(attachmentNames.join(', '))) : ''}
      ${detailRow(brand, 'Booking ID', `<code style="font-size:12px;color:${brand.primaryDark};">${escapeHtml(bookingId)}</code>`)}
    </table>

    ${attachmentNames.length ? `
    <div style="margin-top:24px;padding:16px;border-left:4px solid ${brand.primary};background:#FFF1F2;border-radius:8px;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${brand.primaryDark};">Client files attached</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:${brand.text};">
        The client uploaded ${attachmentNames.length === 1 ? 'a file' : `${attachmentNames.length} files`} with their booking. See the email attachment${attachmentNames.length === 1 ? '' : 's'}.
      </p>
    </div>` : ''}

    <div style="margin-top:24px;padding:16px;border-left:4px solid ${brand.primary};background:#FFF1F2;border-radius:8px;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${brand.primaryDark};">Google Calendar</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:${brand.text};">
        The client receives a Google Calendar invite separately. Use the Meet link below to join the session.
      </p>
    </div>

    ${meetLink ? renderButton(brand, meetLink, 'Open Google Meet') : ''}`;

  const html = renderEmailShell({
    title: subject,
    preheader: `${clientName} — ${dateLine} at ${timeLine}`,
    bodyHtml,
    brand,
  });

  const text = [
    `${brand.name} session confirmed`,
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
  brand,
}) {
  const { dateLine, timeLine } = formatMeetingDateTime(startTime, endTime);
  const subject = `Meeting cancelled: ${clientName} — ${dateLine}`;

  const bodyHtml = `
    <h2 style="margin:0 0 12px;font-size:22px;color:${brand.primaryDark};">Session cancelled</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${brand.text};">
      The following ${escapeHtml(brand.name)} session has been cancelled. The Google Calendar event has been removed and attendees were notified.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${brand.background};border:1px solid ${brand.border};border-radius:12px;padding:4px 16px;margin-bottom:8px;">
      ${detailRow(brand, 'Client', escapeHtml(clientName))}
      ${detailRow(brand, 'Email', escapeHtml(clientEmail))}
      ${detailRow(brand, 'Date', escapeHtml(dateLine))}
      ${detailRow(brand, 'Time', escapeHtml(timeLine))}
      ${detailRow(brand, 'Booking ID', `<code style="font-size:12px;color:${brand.primaryDark};">${escapeHtml(bookingId)}</code>`)}
    </table>`;

  const html = renderEmailShell({
    title: subject,
    preheader: `Session on ${dateLine} was cancelled.`,
    bodyHtml,
    brand,
  });

  const text = [
    `${brand.name} session cancelled`,
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
  brand,
}) {
  const previous = formatMeetingDateTime(previousStartTime, previousEndTime);
  const updated = formatMeetingDateTime(startTime, endTime);
  const subject = `Meeting rescheduled: ${clientName} — ${updated.dateLine}`;

  const bodyHtml = `
    <h2 style="margin:0 0 12px;font-size:22px;color:${brand.primaryDark};">Session rescheduled</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${brand.text};">
      A ${escapeHtml(brand.name)} session has been moved to a new time. The Google Calendar event was updated and attendees were notified.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${brand.background};border:1px solid ${brand.border};border-radius:12px;padding:4px 16px;margin-bottom:8px;">
      ${detailRow(brand, 'Client', escapeHtml(clientName))}
      ${detailRow(brand, 'Email', escapeHtml(clientEmail))}
      ${detailRow(brand, 'Previous', `${escapeHtml(previous.dateLine)}<br /><span style="color:${brand.muted};">${escapeHtml(previous.timeLine)}</span>`)}
      ${detailRow(brand, 'New date', escapeHtml(updated.dateLine))}
      ${detailRow(brand, 'New time', escapeHtml(updated.timeLine))}
      ${detailRow(brand, 'Booking ID', `<code style="font-size:12px;color:${brand.primaryDark};">${escapeHtml(bookingId)}</code>`)}
    </table>

    ${meetLink ? renderButton(brand, meetLink, 'Open Google Meet') : ''}`;

  const html = renderEmailShell({
    title: subject,
    preheader: `Moved from ${previous.dateLine} to ${updated.dateLine}.`,
    bodyHtml,
    brand,
  });

  const text = [
    `${brand.name} session rescheduled`,
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
