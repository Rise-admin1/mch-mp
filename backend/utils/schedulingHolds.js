export const HOLD_DURATION_MS = 10 * 60 * 1000;
export const SLOT_DURATION_MS = 60 * 60 * 1000;

export function normalizeSlotStart(instant) {
    const date = instant instanceof Date ? instant : new Date(instant);
    return Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        0,
        0,
        0
    );
}

export function slotStartKey(instant) {
    return normalizeSlotStart(instant);
}

export function activeBookingWhere(now = new Date()) {
    return {
        OR: [
            { status: 'confirmed' },
            {
                status: 'pending',
                OR: [{ expiresAt: { gt: now } }, { expiresAt: null }],
            },
        ],
    };
}

function expiredHoldBookingsWhere(now = new Date()) {
    return {
        payment: { is: null },
        OR: [
            {
                status: 'pending',
                expiresAt: { lte: now },
            },
            {
                status: { in: ['expired', 'cancelled'] },
            },
        ],
    };
}

/**
 * DB-only: delete expired unpaid holds. Safe inside interactive transactions.
 * Does not touch S3 — run purgeExpiredHoldStorage separately when outside a transaction.
 */
export async function deleteExpiredHoldBookings(db, now = new Date()) {
    const expiredBookings = await db.schedulingBooking.findMany({
        where: expiredHoldBookingsWhere(now),
        select: { id: true },
    });

    if (!expiredBookings.length) {
        return { count: 0 };
    }

    return db.schedulingBooking.deleteMany({
        where: {
            id: { in: expiredBookings.map((booking) => booking.id) },
        },
    });
}

/**
 * S3 + attachment rows for expired holds and orphan uploads. Must run outside transactions.
 */
export async function purgeExpiredHoldStorage(db, now = new Date()) {
    const { cleanupExpiredOrphanUploads, purgeBookingAttachments } = await import('./schedulingUploads.js');

    await cleanupExpiredOrphanUploads(db, now);

    const expiredBookings = await db.schedulingBooking.findMany({
        where: expiredHoldBookingsWhere(now),
        select: { id: true },
    });

    for (const booking of expiredBookings) {
        await purgeBookingAttachments(db, booking.id);
    }
}

/**
 * Full cleanup: purge S3 storage, then delete expired hold rows.
 * Use outside interactive transactions (webhook, get-availability).
 */
export async function releaseExpiredHolds(db, now = new Date()) {
    await purgeExpiredHoldStorage(db, now);
    return deleteExpiredHoldBookings(db, now);
}

export async function assertSlotAvailable(tx, { startTime, now = new Date(), excludeBookingId = null }) {
    await deleteExpiredHoldBookings(tx, now);

    const normalizedStart = slotStartKey(startTime);
    const normalizedEnd = normalizedStart + SLOT_DURATION_MS;

    const existing = await tx.schedulingBooking.findFirst({
        where: {
            startTime: {
                gte: new Date(normalizedStart),
                lt: new Date(normalizedEnd),
            },
            ...activeBookingWhere(now),
            ...(excludeBookingId ? { NOT: { id: excludeBookingId } } : {}),
        },
        select: { id: true },
    });

    if (existing) {
        const err = new Error('Slot is already reserved or booked');
        err.statusCode = 409;
        throw err;
    }
}
