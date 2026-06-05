import { PrismaClient } from '@prisma/client';
import { isSchedulingS3Enabled } from '../utils/schedulingS3.js';
import { deleteVaultFile, getVaultPresignedViewUrl, saveVaultFile } from '../utils/vaultUploads.js';

const prisma = new PrismaClient();

function normalizeVaultDocument(doc) {
  return {
    id: doc.id,
    title: doc.title ?? undefined,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    url: doc.url,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const getVaultDocuments = async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query || {};

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const MAX_LIMIT = 50;
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [totalCount, documents] = await Promise.all([
      prisma.vaultDocument.count(),
      prisma.vaultDocument.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      data: {
        documents: documents.map(normalizeVaultDocument),
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching vault documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vault documents',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const uploadVaultDocument = async (req, res) => {
  try {
    if (!isSchedulingS3Enabled()) {
      return res.status(503).json({
        success: false,
        message:
          'File uploads are not configured. Set SCHEDULING_S3_BUCKET, VAULT_S3_PREFIX (optional), and AWS credentials to enable uploads.',
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'file is required' });
    }

    const title = req.body?.title;
    const saved = await saveVaultFile(req.file, title);

    const document = await prisma.vaultDocument.create({
      data: {
        id: saved.id,
        title: saved.title,
        originalName: saved.originalName,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        storagePath: saved.storagePath,
        url: saved.url,
      },
    });

    res.status(201).json({
      success: true,
      data: { document: normalizeVaultDocument(document) },
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) {
      console.error('Error uploading vault document:', error);
    }
    res.status(status).json({
      success: false,
      message: error.message || 'Error uploading vault document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const getVaultDocumentViewUrl = async (req, res) => {
  try {
    const { id } = req.params || {};

    if (typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ success: false, message: 'id is required' });
    }

    if (!isSchedulingS3Enabled()) {
      return res.status(503).json({
        success: false,
        message: 'File viewing is not configured. Set SCHEDULING_S3_BUCKET and AWS credentials.',
      });
    }

    const existing = await prisma.vaultDocument.findUnique({ where: { id: id.trim() } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const { viewUrl, expiresIn } = await getVaultPresignedViewUrl(
      existing.storagePath,
      existing.mimeType
    );

    res.status(200).json({
      success: true,
      data: { viewUrl, expiresIn },
    });
  } catch (error) {
    console.error('Error creating vault view URL:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating view URL',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const deleteVaultDocument = async (req, res) => {
  try {
    const { id } = req.body || {};

    if (typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ success: false, message: 'id is required' });
    }

    const existing = await prisma.vaultDocument.findUnique({ where: { id: id.trim() } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    try {
      await deleteVaultFile(existing.storagePath);
    } catch (s3Error) {
      console.error(`Failed to delete S3 object ${existing.storagePath}:`, s3Error);
    }

    await prisma.vaultDocument.delete({ where: { id: existing.id } });

    res.status(200).json({
      success: true,
      data: { id: existing.id },
    });
  } catch (error) {
    console.error('Error deleting vault document:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting vault document',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
