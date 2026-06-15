import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GUEST_ACCESS_DAYS = 14;
const VAULT_SESSION_SECONDS = 60;

export function getGuestExpiresAt() {
  return new Date(Date.now() + GUEST_ACCESS_DAYS * 24 * 60 * 60 * 1000);
}

function getSessionExpiresAt(user) {
  const sessionExpiry = new Date(Date.now() + VAULT_SESSION_SECONDS * 1000);

  if (user.role === 'GUEST' && user.expiresAt && user.expiresAt < sessionExpiry) {
    return user.expiresAt;
  }

  return sessionExpiry;
}

export async function deleteExpiredVaultSessions() {
  await prisma.vaultSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

export async function deleteExpiredGuestUsers() {
  await prisma.vaultUser.deleteMany({
    where: {
      role: 'GUEST',
      expiresAt: { lt: new Date() },
    },
  });
}

async function loadVaultUserContext(userId) {
  const user = await prisma.vaultUser.findUnique({
    where: { id: userId },
    include: {
      assignments: {
        select: { documentId: true },
      },
    },
  });

  if (!user) return null;

  if (user.role === 'GUEST') {
    if (!user.expiresAt || user.expiresAt < new Date()) {
      await prisma.vaultUser.delete({ where: { id: user.id } }).catch(() => {});
      return null;
    }
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    expiresAt: user.expiresAt ? user.expiresAt.toISOString() : null,
    documentIds: user.assignments.map((a) => a.documentId),
  };
}

export async function createVaultSession(user) {
  const expiresAt = getSessionExpiresAt(user);
  if (!expiresAt || expiresAt < new Date()) {
    throw new Error('Access has expired');
  }

  const token = crypto.randomBytes(32).toString('hex');

  await prisma.vaultSession.create({
    data: {
      token,
      vaultUserId: user.id,
      expiresAt,
    },
  });

  return { token, expiresAt: expiresAt.toISOString() };
}

export async function destroyVaultSession(token) {
  await prisma.vaultSession.deleteMany({ where: { token } });
}

export const requireVaultAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    const session = await prisma.vaultSession.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.vaultSession.delete({ where: { id: session.id } }).catch(() => {});
      }
      return res.status(401).json({ success: false, message: 'Session expired. Please sign in again.' });
    }

    const vaultUser = await loadVaultUserContext(session.vaultUserId);
    if (!vaultUser) {
      await prisma.vaultSession.delete({ where: { id: session.id } }).catch(() => {});
      return res.status(401).json({ success: false, message: 'Access has expired or account not found' });
    }

    req.vaultUser = vaultUser;
    req.vaultSessionToken = token;
    req.vaultSessionExpiresAt = session.expiresAt.toISOString();
    next();
  } catch (error) {
    console.error('Vault auth middleware error:', error);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

export const requireVaultAdmin = (req, res, next) => {
  if (req.vaultUser?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};
