export const FREE_INVITE_DURATION_MS = 10 * 60 * 1000;

export function normalizeInviteEmail(email) {
  return String(email).trim().toLowerCase();
}

export function isValidInviteEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeInviteEmail(email));
}

export function getInviteStatus(invite, now = new Date()) {
  if (!invite) return 'not_found';
  if (invite.usedAt) return 'used';
  if (invite.type === 'free' && invite.expiresAt && invite.expiresAt.getTime() <= now.getTime()) {
    return 'expired';
  }
  return 'active';
}

export function assertInviteUsable(invite, email, now = new Date()) {
  const status = getInviteStatus(invite, now);
  if (status === 'not_found') {
    const err = new Error('Invite not found');
    err.statusCode = 404;
    throw err;
  }
  if (status === 'used') {
    const err = new Error('This invite link has already been used');
    err.statusCode = 410;
    throw err;
  }
  if (status === 'expired') {
    const err = new Error('This complimentary invite link has expired');
    err.statusCode = 410;
    throw err;
  }
  if (normalizeInviteEmail(email) !== normalizeInviteEmail(invite.email)) {
    const err = new Error('Email does not match this invite');
    err.statusCode = 403;
    throw err;
  }
}

export function toInviteDto(invite, shareUrl) {
  return {
    id: invite.id,
    email: invite.email,
    type: invite.type,
    expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
    usedAt: invite.usedAt ? invite.usedAt.toISOString() : null,
    createdAt: invite.createdAt.toISOString(),
    shareUrl,
    status: getInviteStatus(invite),
  };
}
