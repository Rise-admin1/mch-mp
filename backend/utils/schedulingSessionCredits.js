export const SESSION_GRANT_MIN = 1;

export function getRemainingSessions(credit) {
  if (!credit) return 0;
  return Math.max(0, credit.totalSessions - credit.usedSessions);
}

export function parseSessionGrantCount(value) {
  const sessions = Number(value);
  if (!Number.isInteger(sessions) || sessions < SESSION_GRANT_MIN) {
    return {
      error: `sessions must be an integer of at least ${SESSION_GRANT_MIN}`,
    };
  }
  return { sessions };
}

export function toSessionCreditDto(credit, shareUrl = null) {
  const remainingSessions = getRemainingSessions(credit);
  return {
    id: credit.id,
    email: credit.email,
    appSource: credit.appSource,
    totalSessions: credit.totalSessions,
    usedSessions: credit.usedSessions,
    remainingSessions,
    notes: credit.notes,
    inviteId: credit.inviteId,
    shareUrl,
    createdAt: credit.createdAt.toISOString(),
    updatedAt: credit.updatedAt.toISOString(),
  };
}

export async function resolvePackageInviteForCredit(tx, credit, normalizedEmail) {
  let currentCredit = credit;
  let invite = currentCredit.inviteId
    ? await tx.schedulingInvite.findUnique({ where: { id: currentCredit.inviteId } })
    : null;

  if (invite?.usedAt) {
    invite = await tx.schedulingInvite.update({
      where: { id: invite.id },
      data: { usedAt: null },
    });
  }

  if (!invite) {
    invite = await tx.schedulingInvite.create({
      data: {
        email: normalizedEmail,
        type: 'package',
        expiresAt: null,
      },
    });
    currentCredit = await tx.schedulingSessionCredit.update({
      where: { id: currentCredit.id },
      data: { inviteId: invite.id },
    });
  }

  return { credit: currentCredit, invite };
}
