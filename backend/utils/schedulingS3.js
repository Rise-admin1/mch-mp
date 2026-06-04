import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const DEFAULT_PREFIX = 'scheduling-uploads';

let client = null;

export function isSchedulingS3Enabled() {
  return Boolean(process.env.SCHEDULING_S3_BUCKET?.trim());
}

export function getSchedulingS3Bucket() {
  return process.env.SCHEDULING_S3_BUCKET?.trim() || null;
}

export function getSchedulingS3Prefix() {
  const raw = process.env.SCHEDULING_S3_PREFIX?.trim();
  return raw ? raw.replace(/^\/+|\/+$/g, '') : DEFAULT_PREFIX;
}

function getS3Client() {
  if (!client) {
    const region = process.env.SCHEDULING_S3_REGION?.trim() || process.env.AWS_REGION?.trim() || 'ap-south-1';
    client = new S3Client({ region });
  }
  return client;
}

export async function putSchedulingUpload({ key, body, contentType }) {
  const bucket = getSchedulingS3Bucket();
  if (!bucket) {
    throw new Error('SCHEDULING_S3_BUCKET is not configured');
  }

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
    })
  );
}

export async function getSchedulingUpload(key) {
  const bucket = getSchedulingS3Bucket();
  if (!bucket) {
    throw new Error('SCHEDULING_S3_BUCKET is not configured');
  }

  const response = await getS3Client().send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function deleteSchedulingUpload(key) {
  const bucket = getSchedulingS3Bucket();
  if (!bucket) return;

  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

export function isSchedulingS3Key(storagePath) {
  if (!storagePath || typeof storagePath !== 'string') return false;
  const prefix = getSchedulingS3Prefix();
  return storagePath.startsWith(`${prefix}/`);
}

export function getSchedulingUploadUrl(key) {
  const customBase = process.env.SCHEDULING_S3_PUBLIC_BASE_URL?.trim();
  if (customBase) {
    return `${customBase.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
  }

  const bucket = getSchedulingS3Bucket();
  if (!bucket) {
    throw new Error('SCHEDULING_S3_BUCKET is not configured');
  }

  const region =
    process.env.SCHEDULING_S3_REGION?.trim() ||
    process.env.AWS_REGION?.trim() ||
    'ap-south-1';

  return `https://${bucket}.s3.${region}.amazonaws.com/${key.replace(/^\/+/, '')}`;
}
