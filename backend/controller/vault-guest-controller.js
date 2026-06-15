import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { getGuestExpiresAt } from '../middleware/vaultAuth.js';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

function normalizeGuestAccess(guest) {
  return {
    id: guest.id,
    username: guest.username,
    expiresAt: guest.expiresAt?.toISOString(),
    createdAt: guest.createdAt.toISOString(),
    documents: guest.assignments.map((assignment) => ({
      id: assignment.document.id,
      title: assignment.document.title ?? undefined,
      originalName: assignment.document.originalName,
    })),
  };
}

function parseDocumentIds(body) {
  const { documentIds, documentId } = body || {};

  if (Array.isArray(documentIds) && documentIds.length > 0) {
    return [...new Set(documentIds.map((id) => String(id).trim()).filter(Boolean))];
  }

  if (typeof documentId === 'string' && documentId.trim()) {
    return [documentId.trim()];
  }

  return [];
}

export const createVaultGuestAccess = async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const ids = parseDocumentIds(req.body);

    if (typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ success: false, message: 'username is required' });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'password is required and must be at least 8 characters',
      });
    }

    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one documentId is required' });
    }

    const trimmedUsername = username.trim();

    const documents = await prisma.vaultDocument.findMany({
      where: { id: { in: ids } },
    });

    if (documents.length !== ids.length) {
      return res.status(404).json({ success: false, message: 'One or more documents were not found' });
    }

    const existingUser = await prisma.vaultUser.findUnique({
      where: { username: trimmedUsername },
    });

    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    const activeAssignments = await prisma.vaultUserDocument.findMany({
      where: {
        documentId: { in: ids },
        vaultUser: {
          role: 'GUEST',
          expiresAt: { gt: new Date() },
        },
      },
      include: {
        document: { select: { originalName: true, title: true } },
      },
    });

    if (activeAssignments.length > 0) {
      const names = activeAssignments.map((a) => a.document.title || a.document.originalName);
      return res.status(409).json({
        success: false,
        message: `These documents already have active guest access: ${names.join(', ')}`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const expiresAt = getGuestExpiresAt();

    const guest = await prisma.vaultUser.create({
      data: {
        username: trimmedUsername,
        password: hashedPassword,
        role: 'GUEST',
        expiresAt,
        assignments: {
          create: ids.map((documentId) => ({ documentId })),
        },
      },
      include: {
        assignments: {
          include: { document: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: normalizeGuestAccess(guest),
    });
  } catch (error) {
    console.error('Error creating vault guest access:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating guest access',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const listVaultGuestAccess = async (req, res) => {
  try {
    const guests = await prisma.vaultUser.findMany({
      where: {
        role: 'GUEST',
        expiresAt: { gt: new Date() },
      },
      include: {
        assignments: {
          include: { document: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: {
        guests: guests.map(normalizeGuestAccess),
      },
    });
  } catch (error) {
    console.error('Error listing vault guest access:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing guest access',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const addVaultGuestDocuments = async (req, res) => {
  try {
    const { id } = req.params || {};
    const ids = parseDocumentIds(req.body);

    if (typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ success: false, message: 'id is required' });
    }

    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one documentId is required' });
    }

    const guest = await prisma.vaultUser.findUnique({
      where: { id: id.trim() },
      include: {
        assignments: { include: { document: true } },
      },
    });

    if (!guest || guest.role !== 'GUEST') {
      return res.status(404).json({ success: false, message: 'Guest access not found' });
    }

    if (guest.expiresAt && guest.expiresAt <= new Date()) {
      return res.status(400).json({ success: false, message: 'Guest access has expired' });
    }

    const existingDocIds = new Set(guest.assignments.map((assignment) => assignment.documentId));
    const newIds = ids.filter((documentId) => !existingDocIds.has(documentId));

    if (newIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All selected documents are already assigned to this guest',
      });
    }

    const documents = await prisma.vaultDocument.findMany({
      where: { id: { in: newIds } },
    });

    if (documents.length !== newIds.length) {
      return res.status(404).json({ success: false, message: 'One or more documents were not found' });
    }

    const activeAssignments = await prisma.vaultUserDocument.findMany({
      where: {
        documentId: { in: newIds },
        vaultUserId: { not: guest.id },
        vaultUser: {
          role: 'GUEST',
          expiresAt: { gt: new Date() },
        },
      },
      include: {
        document: { select: { originalName: true, title: true } },
      },
    });

    if (activeAssignments.length > 0) {
      const names = activeAssignments.map((a) => a.document.title || a.document.originalName);
      return res.status(409).json({
        success: false,
        message: `These documents already have active guest access: ${names.join(', ')}`,
      });
    }

    await prisma.vaultUserDocument.createMany({
      data: newIds.map((documentId) => ({
        vaultUserId: guest.id,
        documentId,
      })),
    });

    const updatedGuest = await prisma.vaultUser.findUnique({
      where: { id: guest.id },
      include: {
        assignments: {
          include: { document: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: normalizeGuestAccess(updatedGuest),
    });
  } catch (error) {
    console.error('Error adding vault guest documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding documents to guest access',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const revokeVaultGuestAccess = async (req, res) => {
  try {
    const { id } = req.params || {};

    if (typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ success: false, message: 'id is required' });
    }

    const guest = await prisma.vaultUser.findUnique({
      where: { id: id.trim() },
    });

    if (!guest || guest.role !== 'GUEST') {
      return res.status(404).json({ success: false, message: 'Guest access not found' });
    }

    await prisma.vaultUser.delete({ where: { id: guest.id } });

    res.status(200).json({
      success: true,
      data: { id: guest.id },
    });
  } catch (error) {
    console.error('Error revoking vault guest access:', error);
    res.status(500).json({
      success: false,
      message: 'Error revoking guest access',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
