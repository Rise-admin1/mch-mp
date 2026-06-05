import { Resend } from 'resend';
import { normalizeAppSource } from './schedulingStripe.js';

const resendClients = new Map();

function readEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function getResendConfig(appSource) {
  const normalized = normalizeAppSource(appSource) || 'phd-success';
  const isRise = normalized === 'rise';

  const apiKey = readEnv(isRise ? 'RISE_RESEND_API_KEY' : 'RESEND_API_KEY');
  const fromEmail = readEnv(isRise ? 'RISE_RESEND_FROM_EMAIL' : 'RESEND_FROM_EMAIL');

  return {
    appSource: normalized,
    apiKey,
    fromEmail,
  };
}

function getResendClient(apiKey) {
  if (!apiKey) return null;

  if (!resendClients.has(apiKey)) {
    resendClients.set(apiKey, new Resend(apiKey));
  }

  return resendClients.get(apiKey);
}

export function isResendConfigured(appSource = 'phd-success') {
  const { apiKey, fromEmail } = getResendConfig(appSource);
  return Boolean(apiKey && fromEmail);
}

export async function sendEmail({ to, subject, html, text, attachments, appSource = 'phd-success' }) {
  const { apiKey, fromEmail } = getResendConfig(appSource);
  const client = getResendClient(apiKey);

  if (!client || !fromEmail) {
    console.warn(
      `Resend is not configured for ${appSource} (missing API key or from address). Skipping email.`
    );
    return { skipped: true };
  }

  if (!to || !subject || !html) {
    throw new Error('Email requires to, subject, and html');
  }

  const { data, error } = await client.emails.send({
    from: fromEmail,
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
