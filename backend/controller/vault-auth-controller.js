import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const vaultLogin = async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ success: false, message: 'username is required' });
    }

    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ success: false, message: 'password is required' });
    }

    const user = await prisma.vaultUser.findUnique({
      where: { username: username.trim() },
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    res.status(200).json({
      success: true,
      data: {
        username: user.username,
      },
    });
  } catch (error) {
    console.error('Vault login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
