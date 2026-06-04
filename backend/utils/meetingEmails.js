import {
  buildMeetingCancelledEmail,
  buildMeetingRescheduledEmail,
  buildMeetingScheduledEmail,
} from '../templates/meetingScheduledEmail.js';
import { readAttachmentContent } from './schedulingUploads.js';
import { isResendConfigured, sendEmail } from './resend.js';

const DEFAULT_EMAIL_LOGO_URL =
  'https://amzn-s3-rightintellectual.s3.ap-south-1.amazonaws.com/phd_logo.png';

function getLogoUrl() {
  return process.env.SCHEDULING_EMAIL_LOGO_URL?.trim() || DEFAULT_EMAIL_LOGO_URL;
}

function getStaticNotifyEmail() {
  return process.env.SCHEDULING_HOST_EMAIL?.trim() || null;
}

function getRecipients(bookingEmail) {
  const staticEmail = getStaticNotifyEmail();
  if (!staticEmail) {
    console.warn('SCHEDULING_HOST_EMAIL is not set. Static notification will be skipped.');
  }

  const trimmedBookingEmail = bookingEmail?.trim();
  if (!trimmedBookingEmail) {
    return [];
  }

  const recipients = [{ to: trimmedBookingEmail, role: 'booking' }];
  if (staticEmail) {
    recipients.push({ to: staticEmail, role: 'static' });
  }

  return recipients.filter(
    (entry, index, list) =>
      list.findIndex((item) => item.to.toLowerCase() === entry.to.toLowerCase()) === index
  );
}

async function dispatchMeetingEmail(emailContent, bookingEmail, emailAttachments = []) {
  if (!isResendConfigured()) {
    console.warn('Resend not configured. Skipping meeting email.');
    return { skipped: true, sent: [] };
  }

  const recipients = getRecipients(bookingEmail);
  if (recipients.length === 0) {
    console.warn('No valid recipients. Skipping meeting email.');
    return { skipped: true, sent: [] };
  }

  const sent = [];

  for (const recipient of recipients) {
    const result = await sendEmail({
      to: recipient.to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      attachments: emailAttachments.length ? emailAttachments : undefined,
    });

    if (!result.skipped) {
      sent.push({ recipient: recipient.to, role: recipient.role, id: result.id });
    }
  }

  return { skipped: false, sent };
}

async function buildEmailAttachments(booking) {
  const attachments = booking.attachments || [];
  if (!attachments.length) return [];

  const emailAttachments = [];
  for (const attachment of attachments) {
    try {
      const content = await readAttachmentContent(attachment.storagePath);
      emailAttachments.push({
        filename: attachment.originalName,
        content,
      });
    } catch (error) {
      console.error(`Failed to read S3 attachment ${attachment.id} (${attachment.storagePath}):`, error);
    }
  }
  return emailAttachments;
}

export async function sendMeetingScheduledEmails(booking) {
  const attachmentNames = (booking.attachments || []).map((item) => item.originalName);
  const emailAttachments = await buildEmailAttachments(booking);
  const emailContent = buildMeetingScheduledEmail({
    clientName: booking.name,
    clientEmail: booking.email,
    startTime: booking.startTime,
    endTime: booking.endTime,
    meetLink: booking.meetLink || null,
    bookingId: booking.id,
    logoUrl: getLogoUrl(),
    notes: booking.notes || null,
    attachmentNames,
  });

  return dispatchMeetingEmail(emailContent, booking.email, emailAttachments);
}

export async function sendMeetingCancelledEmails(booking) {
  const emailContent = buildMeetingCancelledEmail({
    clientName: booking.name,
    clientEmail: booking.email,
    startTime: booking.startTime,
    endTime: booking.endTime,
    bookingId: booking.id,
    logoUrl: getLogoUrl(),
  });

  return dispatchMeetingEmail(emailContent, booking.email);
}

export async function sendMeetingRescheduledEmails(booking, previousTimes) {
  const emailContent = buildMeetingRescheduledEmail({
    clientName: booking.name,
    clientEmail: booking.email,
    previousStartTime: previousTimes.startTime,
    previousEndTime: previousTimes.endTime,
    startTime: booking.startTime,
    endTime: booking.endTime,
    meetLink: booking.meetLink || null,
    bookingId: booking.id,
    logoUrl: getLogoUrl(),
  });

  return dispatchMeetingEmail(emailContent, booking.email);
}
