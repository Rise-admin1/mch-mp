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

/**
 * Deletes unpaid holds that are no longer active so the unique
 * [availabilityId, startTime] constraint does not block re-booking.
 */
export async function releaseExpiredHolds(db, now = new Date()) {
    return db.schedulingBooking.deleteMany({
        where: {
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
        },
    });
}

export async function assertSlotAvailable(tx, { startTime, now = new Date() }) {
    await releaseExpiredHolds(tx, now);

    const normalizedStart = slotStartKey(startTime);
    const normalizedEnd = normalizedStart + SLOT_DURATION_MS;

    const existing = await tx.schedulingBooking.findFirst({
        where: {
            startTime: {
                gte: new Date(normalizedStart),
                lt: new Date(normalizedEnd),
            },
            ...activeBookingWhere(now),
        },
        select: { id: true },
    });

    if (existing) {
        const err = new Error('Slot is already reserved or booked');
        err.statusCode = 409;
        throw err;
    }
}
