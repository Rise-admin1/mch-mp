import crypto from 'crypto';
import path from 'path';
import { HOLD_DURATION_MS } from './schedulingHolds.js';
import {
  deleteSchedulingUpload,
  getSchedulingS3Prefix,
  getSchedulingUpload,
  isSchedulingS3Enabled,
  isSchedulingS3Key,
  putSchedulingUpload,
} from './schedulingS3.js';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export function isAllowedUploadMimeType(mimeType) {
  return ALLOWED_UPLOAD_MIME_TYPES.has(mimeType);
}

export function createUploadToken() {
  return crypto.randomUUID();
}

function readFileBody(file) {
  if (file.buffer) {
    return file.buffer;
  }
  throw new Error('Uploaded file has no content');
}

export async function saveUploadedFile(file, uploadToken, expiresAt) {
  if (!isSchedulingS3Enabled()) {
    const err = new Error('File uploads are not configured (SCHEDULING_S3_BUCKET is required)');
    err.statusCode = 503;
    throw err;
  }

  const safeExt = path.extname(file.originalname || '').slice(0, 16);
  const storageName = `${uploadToken}${safeExt}`;
  const key = `${getSchedulingS3Prefix()}/${storageName}`;
  const body = readFileBody(file);

  await putSchedulingUpload({
    key,
    body,
    contentType: file.mimetype,
  });

  return {
    uploadToken,
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    storagePath: key,
    expiresAt,
  };
}

export async function claimUploadForBooking(tx, uploadToken, bookingId, now = new Date()) {
  if (!uploadToken || typeof uploadToken !== 'string' || !uploadToken.trim()) {
    return null;
  }

  const attachment = await tx.schedulingBookingAttachment.findFirst({
    where: {
      uploadToken: uploadToken.trim(),
      bookingId: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });

  if (!attachment) {
    const err = new Error('Uploaded file not found or expired. Please upload again.');
    err.statusCode = 400;
    throw err;
  }

  await tx.schedulingBookingAttachment.update({
    where: { id: attachment.id },
    data: {
      bookingId,
      uploadToken: null,
      expiresAt: null,
    },
  });

  return attachment.id;
}

export function getUploadExpiry(now = new Date()) {
  return new Date(now.getTime() + HOLD_DURATION_MS);
}

export async function readAttachmentContent(storagePath) {
  if (!isSchedulingS3Key(storagePath)) {
    throw new Error(`Unsupported attachment storage path: ${storagePath}`);
  }
  return getSchedulingUpload(storagePath);
}

export async function deleteAttachmentFile(storagePath) {
  if (!isSchedulingS3Key(storagePath)) {
    return;
  }
  await deleteSchedulingUpload(storagePath);
}

async function purgeAttachmentRecords(db, attachments) {
  if (!attachments.length) return;

  await Promise.all(
    attachments.map((attachment) =>
      deleteAttachmentFile(attachment.storagePath).catch((error) => {
        console.error(`Failed to delete S3 object ${attachment.storagePath}:`, error);
      })
    )
  );

  await db.schedulingBookingAttachment.deleteMany({
    where: { id: { in: attachments.map((item) => item.id) } },
  });
}

export async function purgeBookingAttachments(db, bookingId) {
  const attachments = await db.schedulingBookingAttachment.findMany({
    where: { bookingId },
  });
  await purgeAttachmentRecords(db, attachments);
}

export async function purgeAttachments(db, attachments) {
  await purgeAttachmentRecords(db, attachments);
}

export async function cleanupExpiredOrphanUploads(db, now = new Date()) {
  const expired = await db.schedulingBookingAttachment.findMany({
    where: {
      bookingId: null,
      expiresAt: { lte: now },
    },
  });
  await purgeAttachmentRecords(db, expired);
  return expired.length;
}
