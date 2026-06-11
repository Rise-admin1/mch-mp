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
