import crypto from 'crypto';
import path from 'path';
import {
  deleteSchedulingUpload,
  getSchedulingPresignedGetUrl,
  getSchedulingUploadUrl,
  isSchedulingS3Enabled,
  putSchedulingUpload,
} from './schedulingS3.js';
import { isAllowedUploadMimeType } from './schedulingUploads.js';

const DEFAULT_VAULT_PREFIX = 'vault';

/** S3 key prefix for Vault documents (separate from SCHEDULING_S3_PREFIX). */
export function getVaultS3Prefix() {
  const raw = process.env.VAULT_S3_PREFIX?.trim();
  return raw ? raw.replace(/^\/+|\/+$/g, '') : DEFAULT_VAULT_PREFIX;
}

export function getVaultUploadUrl(key) {
  const customBase = process.env.VAULT_S3_PUBLIC_BASE_URL?.trim();
  if (customBase) {
    return `${customBase.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
  }
  return getSchedulingUploadUrl(key);
}

export function isVaultS3Key(storagePath) {
  if (!storagePath || typeof storagePath !== 'string') return false;
  const prefix = getVaultS3Prefix();
  return storagePath.startsWith(`${prefix}/`);
}

export async function saveVaultFile(file, title) {
  if (!isSchedulingS3Enabled()) {
    const err = new Error('File uploads are not configured (SCHEDULING_S3_BUCKET is required)');
    err.statusCode = 503;
    throw err;
  }

  if (!isAllowedUploadMimeType(file.mimetype)) {
    const err = new Error('Unsupported file type. Allowed: PDF, Word, text, and images.');
    err.statusCode = 400;
    throw err;
  }

  const body = file.buffer;
  if (!body) {
    const err = new Error('Uploaded file has no content');
    err.statusCode = 400;
    throw err;
  }

  const docId = crypto.randomUUID();
  const safeExt = path.extname(file.originalname || '').slice(0, 16);
  const storageName = `${docId}${safeExt}`;
  const storagePath = `${getVaultS3Prefix()}/${storageName}`;

  await putSchedulingUpload({
    key: storagePath,
    body,
    contentType: file.mimetype,
  });

  const url = getVaultUploadUrl(storagePath);
  const titleValue =
    typeof title === 'string' && title.trim() ? title.trim() : null;

  return {
    id: docId,
    title: titleValue,
    originalName: file.originalname || storageName,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    storagePath,
    url,
  };
}

export async function deleteVaultFile(storagePath) {
  if (!isVaultS3Key(storagePath)) {
    return;
  }
  await deleteSchedulingUpload(storagePath);
}

/** Time-limited URL for viewing a private S3 object in the browser. */
export async function getVaultPresignedViewUrl(storagePath, mimeType) {
  if (!isVaultS3Key(storagePath)) {
    throw new Error('Invalid vault storage path');
  }
  const viewUrl = await getSchedulingPresignedGetUrl(storagePath, {
    responseContentType: mimeType || undefined,
  });
  return { viewUrl, expiresIn: 3600 };
}
