import { Resend } from 'resend';

let resendClient = null;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendEmail({ to, subject, html, text, attachments }) {
  const client = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;

  if (!client || !from) {
    console.warn('Resend is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL). Skipping email.');
    return { skipped: true };
  }

  if (!to || !subject || !html) {
    throw new Error('Email requires to, subject, and html');
  }

  const { data, error } = await client.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    ...(text ? { text } : {}),
    ...(attachments?.length ? { attachments } : {}),
  });

  if (error) {
    throw new Error(error.message || 'Resend failed to send email');
  }

  return { skipped: false, id: data?.id || null };
}
