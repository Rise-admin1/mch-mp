import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import {
  createVaultSession,
  deleteExpiredGuestUsers,
  deleteExpiredVaultSessions,
  destroyVaultSession,
} from '../middleware/vaultAuth.js';

const prisma = new PrismaClient();

async function verifyPassword(user, password) {
  if (user.role === 'GUEST') {
    return bcrypt.compare(password, user.password);
  }
  return user.password === password;
}

export const vaultLogin = async (req, res) => {
  try {
    await deleteExpiredVaultSessions();
    await deleteExpiredGuestUsers();

    const { username, password } = req.body || {};

    if (typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ success: false, message: 'username is required' });
    }

    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ success: false, message: 'password is required' });
    }

    const user = await prisma.vaultUser.findUnique({
      where: { username: username.trim() },
      include: {
        assignments: {
          select: { documentId: true },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    if (user.role === 'GUEST' && user.expiresAt && user.expiresAt < new Date()) {
      await prisma.vaultUser.delete({ where: { id: user.id } });
      return res.status(401).json({ success: false, message: 'Access has expired' });
    }

    const valid = await verifyPassword(user, password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const { token } = await createVaultSession(user);
    const documentIds = user.assignments.map((a) => a.documentId);

    res.status(200).json({
      success: true,
      data: {
        token,
        username: user.username,
        role: user.role,
        expiresAt: user.expiresAt ? user.expiresAt.toISOString() : null,
        documentIds,
      },
    });
  } catch (error) {
    if (error.message === 'Access has expired') {
      return res.status(401).json({ success: false, message: error.message });
    }
    console.error('Vault login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const vaultMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      username: req.vaultUser.username,
      role: req.vaultUser.role,
      expiresAt: req.vaultUser.expiresAt,
      documentIds: req.vaultUser.documentIds,
    },
  });
};

export const vaultLogout = async (req, res) => {
  try {
    if (req.vaultSessionToken) {
      await destroyVaultSession(req.vaultSessionToken);
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Vault logout error:', error);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
};
