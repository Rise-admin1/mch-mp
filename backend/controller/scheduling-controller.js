import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv';
import { assertSlotAvailable, activeBookingWhere, HOLD_DURATION_MS, releaseExpiredHolds, slotStartKey } from '../utils/schedulingHolds.js';
import {
    deleteMeetEventForBooking,
    updateMeetEventForBooking,
} from '../utils/googleCalendar.js';
import {
    sendMeetingCancelledEmails,
    sendMeetingRescheduledEmails,
} from '../utils/meetingEmails.js';
import {
    FREE_INVITE_DURATION_MS,
    assertInviteUsable,
    getInviteStatus,
    isValidInviteEmail,
    normalizeInviteEmail,
    toInviteDto,
} from '../utils/schedulingInvites.js';
import {
    getRemainingSessions,
    parseSessionGrantCount,
    toSessionCreditDto,
} from '../utils/schedulingSessionCredits.js';
import { sendSessionPackageGrantedEmail } from '../utils/sessionPackageEmails.js';
import {
    claimUploadForBooking,
    cleanupExpiredOrphanUploads,
    createUploadToken,
    getUploadExpiry,
    purgeBookingAttachments,
    saveUploadedFile,
} from '../utils/schedulingUploads.js';
import { isSchedulingS3Enabled } from '../utils/schedulingS3.js';
import {
    getSchedulingStripeConfig,
    normalizeAppSource,
} from '../utils/schedulingStripe.js';
dotenv.config();
const prisma = new PrismaClient();

const SLOT_DURATION_MS = 60 * 60 * 1000;

function parseHm(hm) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(hm);
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    return { h, m };
}

function toUtcOnTargetDay(targetDayStartUtc, hm) {
    const parsed = parseHm(hm);
    if (!parsed) return null;
    return new Date(Date.UTC(
        targetDayStartUtc.getUTCFullYear(),
        targetDayStartUtc.getUTCMonth(),
        targetDayStartUtc.getUTCDate(),
        parsed.h,
        parsed.m,
        0,
        0
    ));
}

function ceilToNextHourUtc(instant) {
    const hourStart = new Date(Date.UTC(
        instant.getUTCFullYear(),
        instant.getUTCMonth(),
        instant.getUTCDate(),
        instant.getUTCHours(),
        0,
        0,
        0
    ));
    if (
        instant.getUTCMinutes() !== 0 ||
        instant.getUTCSeconds() !== 0 ||
        instant.getUTCMilliseconds() !== 0
    ) {
        return new Date(hourStart.getTime() + SLOT_DURATION_MS);
    }
    return hourStart;
}

export const getAvailability = async (req, res, next) => {
    try {
        const { date, now } = req.query;

        if (typeof date !== 'string' || typeof now !== 'string') {
            return res.status(400).json({ message: 'Missing required query params: date, now' });
        }
        if (!date.includes('Z') || !now.includes('Z')) {
            return res.status(400).json({ message: 'Query params must be UTC ISO strings ending with Z' });
        }

        const dateInstant = new Date(date);
        const nowInstant = new Date(now);
        if (Number.isNaN(dateInstant.getTime()) || Number.isNaN(nowInstant.getTime())) {
            return res.status(400).json({ message: 'Invalid date/now query params (must be ISO datetimes)' });
        }

        await releaseExpiredHolds(prisma, nowInstant);

        const targetDayStartUtc = new Date(Date.UTC(
            dateInstant.getUTCFullYear(),
            dateInstant.getUTCMonth(),
            dateInstant.getUTCDate(),
            0, 0, 0, 0
        ));
        const targetDayEndUtc = new Date(targetDayStartUtc.getTime() + 24 * 60 * 60 * 1000);
        const targetDayOfWeek = targetDayStartUtc.getUTCDay(); // 0=Sun..6=Sat

        const availabilityRows = await prisma.schedulingAvailability.findMany({
            where: { dayOfWeek: targetDayOfWeek },
            select: { id: true, startTime: true, endTime: true }
        });

        const generatedSlots = [];

        for (const row of availabilityRows) {
            const windowStart = toUtcOnTargetDay(targetDayStartUtc, row.startTime);
            const windowEnd = toUtcOnTargetDay(targetDayStartUtc, row.endTime);
            if (!windowStart || !windowEnd) continue;
            if (windowEnd.getTime() <= windowStart.getTime()) continue;

            for (let slotStart = new Date(windowStart);;) {
                const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MS);
                if (slotEnd.getTime() > windowEnd.getTime()) break;
                generatedSlots.push({ startTime: slotStart, endTime: slotEnd, availabilityId: row.id });
                slotStart = new Date(slotStart.getTime() + SLOT_DURATION_MS);
            }
        }

        const minSlotStartUtc = ceilToNextHourUtc(nowInstant);
        const candidateSlots = generatedSlots.filter(
            (slot) => slot.startTime.getTime() >= minSlotStartUtc.getTime()
        );

        const bookings = await prisma.schedulingBooking.findMany({
            where: {
                startTime: { gte: targetDayStartUtc, lt: targetDayEndUtc },
                ...activeBookingWhere(nowInstant),
            },
            select: { startTime: true }
        });

        const blockedSlotStarts = new Set(
            bookings.map((booking) => slotStartKey(booking.startTime))
        );

        const seenStartTimes = new Set();
        const slots = candidateSlots
            .filter((slot) => !blockedSlotStarts.has(slotStartKey(slot.startTime)))
            .filter((slot) => {
                const startIso = slot.startTime.toISOString();
                if (seenStartTimes.has(startIso)) return false;
                seenStartTimes.add(startIso);
                return true;
            })
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
            .map((slot) => ({
                availabilityId: slot.availabilityId,
                startTime: slot.startTime.toISOString(),
                endTime: slot.endTime.toISOString()
            }));

        const dateYmd = `${targetDayStartUtc.getUTCFullYear()}-${String(targetDayStartUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(targetDayStartUtc.getUTCDate()).padStart(2, '0')}`;

        res.status(200).json({
            date: dateYmd,
            timezone: 'UTC',
            slots
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export const createCheckout = async (req, res, next) => {
    try {
        const { name, email, notes, startTime, availabilityId, inviteId, uploadToken, appSource: rawAppSource } = req.body || {};

        const appSource = normalizeAppSource(rawAppSource) || 'phd-success';
        const stripeConfig = getSchedulingStripeConfig(appSource);
        const { stripe, successUrl: stripeSuccessUrl, cancelUrl: stripeCancelUrl, freeCouponId: stripeFreeCouponId, priceId: stripePriceId, productName, defaultAmount } = stripeConfig;

        if (!stripe || !stripeSuccessUrl || !stripeCancelUrl) {
            return res.status(500).json({ message: 'Stripe is not configured' });
        }

        if (typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ message: 'name is required' });
        }
        if (typeof email !== 'string' || !email.trim()) {
            return res.status(400).json({ message: 'email is required' });
        }
        if (typeof startTime !== 'string' || !startTime.includes('Z')) {
            return res.status(400).json({ message: 'startTime must be a UTC ISO string ending with Z' });
        }
        if (typeof availabilityId !== 'string' || !availabilityId.trim()) {
            return res.status(400).json({ message: 'availabilityId is required' });
        }

        let invite = null;
        if (inviteId != null && inviteId !== '') {
            if (typeof inviteId !== 'string' || !inviteId.trim()) {
                return res.status(400).json({ message: 'inviteId must be a valid string' });
            }
            invite = await prisma.schedulingInvite.findUnique({
                where: { id: inviteId.trim() },
                include: { sessionCredit: true },
            });
            try {
                assertInviteUsable(invite, email.trim(), new Date(), invite?.sessionCredit ?? null);
            } catch (err) {
                return res.status(err.statusCode || 400).json({ message: err.message });
            }
            if ((invite.type === 'free' || invite.type === 'package') && !stripeFreeCouponId) {
                return res.status(500).json({ message: 'Free checkout is not configured (missing STRIPE_FREE_COUPON_ID)' });
            }
        }

        const start = new Date(startTime);
        if (Number.isNaN(start.getTime())) {
            return res.status(400).json({ message: 'Invalid startTime' });
        }
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        const now = new Date();
        const expiresAt = new Date(now.getTime() + HOLD_DURATION_MS);

        const created = await prisma.$transaction(async (tx) => {
            const availability = await tx.schedulingAvailability.findUnique({
                where: { id: availabilityId },
                select: { id: true }
            });
            if (!availability) {
                const err = new Error('Availability not found');
                err.statusCode = 404;
                throw err;
            }

            await assertSlotAvailable(tx, {
                availabilityId: availabilityId.trim(),
                startTime: start,
                now,
            });

            const booking = await tx.schedulingBooking.create({
                data: {
                    name: name.trim(),
                    email: email.trim(),
                    notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
                    startTime: start,
                    endTime: end,
                    status: 'pending',
                    expiresAt,
                    availabilityId: availabilityId.trim(),
                    appSource,
                },
                select: { id: true }
            });

            if (uploadToken) {
                await claimUploadForBooking(tx, uploadToken, booking.id, now);
            }

            return booking;
        });

        const lineItems = stripePriceId
            ? [{ price: stripePriceId, quantity: 1 }]
            : [
                {
                    quantity: 1,
                    price_data: {
                        currency: 'aed',
                        unit_amount: defaultAmount,
                        product_data: {
                            name: productName,
                            description: 'One-hour consultative session',
                        },
                    },
                },
            ];

        const sessionParams = {
            mode: 'payment',
            customer_email: email.trim(),
            client_reference_id: created.id,
            metadata: {
                bookingId: created.id,
                appSource,
                sessionStartTime: start.toISOString(),
                ...(invite ? { inviteId: invite.id } : {}),
            },
            success_url: stripeSuccessUrl,
            cancel_url: stripeCancelUrl,
            line_items: lineItems,
        };

        if (invite?.type === 'free' || invite?.type === 'package') {
            sessionParams.discounts = [{ coupon: stripeFreeCouponId }];
        }

        let session;
        try {
            session = await stripe.checkout.sessions.create(sessionParams);
        } catch (stripeError) {
            await purgeBookingAttachments(prisma, created.id).catch((purgeError) => {
                console.error('Failed to purge attachments after Stripe error:', purgeError);
            });
            await prisma.schedulingBooking.delete({ where: { id: created.id } }).catch((deleteError) => {
                console.error('Failed to clean up pending booking after Stripe error:', deleteError);
            });
            throw stripeError;
        }

        await prisma.schedulingBooking.update({
            where: { id: created.id },
            data: { stripeSessionId: session.id },
        });

        res.status(200).json({ bookingId: created.id, url: session.url });
    } catch (error) {
        if (error?.code === 'P2002') {
            return res.status(409).json({ message: 'Slot is already reserved or booked' });
        }
        if (error?.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export const uploadBookingAttachment = async (req, res) => {
    try {
        if (!isSchedulingS3Enabled()) {
            return res.status(503).json({
                message: 'File uploads are not configured. Set SCHEDULING_S3_BUCKET (and AWS credentials) to enable uploads.',
            });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'file is required' });
        }

        const now = new Date();
        await cleanupExpiredOrphanUploads(prisma, now);

        const uploadToken = createUploadToken();
        const saved = await saveUploadedFile(req.file, uploadToken, getUploadExpiry(now));

        const attachment = await prisma.schedulingBookingAttachment.create({
            data: {
                uploadToken: saved.uploadToken,
                originalName: saved.originalName,
                mimeType: saved.mimeType,
                sizeBytes: saved.sizeBytes,
                storagePath: saved.storagePath,
                expiresAt: saved.expiresAt,
            },
            select: {
                id: true,
                uploadToken: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                expiresAt: true,
            },
        });

        res.status(201).json({
            uploadToken: attachment.uploadToken,
            file: {
                id: attachment.id,
                originalName: attachment.originalName,
                mimeType: attachment.mimeType,
                sizeBytes: attachment.sizeBytes,
                expiresAt: attachment.expiresAt?.toISOString() || null,
            },
        });
    } catch (error) {
        console.error(error);
        if (error?.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        if (error?.message?.includes('Unsupported file type')) {
            return res.status(400).json({ message: error.message });
        }
        if (error?.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File is too large. Maximum size is 10 MB.' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

function toEventDto(booking) {
    return {
        id: booking.id,
        name: booking.name,
        email: booking.email,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        meetLink: booking.meetLink,
    };
}

function parseOffsetPagination(query) {
    const parsedCompletedOffset = parseInt(query.completedOffset, 10);
    const parsedUpcomingOffset = parseInt(query.upcomingOffset, 10);
    const parsedLimit = parseInt(query.limit, 10);

    const completedOffset = Number.isNaN(parsedCompletedOffset) ? 0 : Math.max(0, parsedCompletedOffset);
    const upcomingOffset = Number.isNaN(parsedUpcomingOffset) ? 0 : Math.max(0, parsedUpcomingOffset);
    const limitCandidate = Number.isNaN(parsedLimit) ? 10 : parsedLimit;
    const limit = Math.min(100, limitCandidate <= 0 ? 10 : limitCandidate);

    return { completedOffset, upcomingOffset, limit };
}

function parseAppSourceQuery(query) {
    const appSource = normalizeAppSource(query?.appSource);
    if (!appSource) {
        return { error: 'appSource query param is required (phd-success or rise)' };
    }
    return { appSource };
}

function parseAppSourceBody(body) {
    const appSource = normalizeAppSource(body?.appSource);
    if (!appSource) {
        return { error: 'appSource is required (phd-success or rise)' };
    }
    return { appSource };
}

function confirmedBookingsWhere(appSource, extra = {}) {
    return { status: 'confirmed', appSource, ...extra };
}

export const getMetrics = async (req, res, next) => {
    try {
        const parsedAppSource = parseAppSourceQuery(req.query);
        if (parsedAppSource.error) {
            return res.status(400).json({ message: parsedAppSource.error });
        }

        const now = new Date();
        const { completedOffset, upcomingOffset, limit } = parseOffsetPagination(req.query);

        const completedWhere = confirmedBookingsWhere(parsedAppSource.appSource, { endTime: { lte: now } });
        const upcomingWhere = confirmedBookingsWhere(parsedAppSource.appSource, { endTime: { gt: now } });
        const eventSelect = {
            id: true,
            name: true,
            email: true,
            startTime: true,
            endTime: true,
            meetLink: true,
        };

        const [
            completedTotalCount,
            upcomingTotalCount,
            completedBookings,
            upcomingBookings,
        ] = await Promise.all([
            prisma.schedulingBooking.count({ where: completedWhere }),
            prisma.schedulingBooking.count({ where: upcomingWhere }),
            prisma.schedulingBooking.findMany({
                where: completedWhere,
                select: eventSelect,
                orderBy: { endTime: 'desc' },
                skip: completedOffset,
                take: limit,
            }),
            prisma.schedulingBooking.findMany({
                where: upcomingWhere,
                select: eventSelect,
                orderBy: { startTime: 'asc' },
                skip: upcomingOffset,
                take: limit,
            }),
        ]);

        res.status(200).json({
            completedEvents: completedBookings.map(toEventDto),
            upcomingEvents: upcomingBookings.map(toEventDto),
            pagination: {
                limit,
                completed: {
                    offset: completedOffset,
                    totalCount: completedTotalCount,
                    hasMore: completedOffset + completedBookings.length < completedTotalCount,
                },
                upcoming: {
                    offset: upcomingOffset,
                    totalCount: upcomingTotalCount,
                    hasMore: upcomingOffset + upcomingBookings.length < upcomingTotalCount,
                },
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

function bookingDurationHours(startTime, endTime) {
    const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
    if (ms <= 0) return 0;
    return ms / (1000 * 60 * 60);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const getBookingStatsByEmail = async (req, res, next) => {
    try {
        const parsedAppSource = parseAppSourceQuery(req.query);
        if (parsedAppSource.error) {
            return res.status(400).json({ message: parsedAppSource.error });
        }

        const rawEmail = req.query?.email;
        if (typeof rawEmail !== 'string' || !rawEmail.trim()) {
            return res.status(400).json({ message: 'email query param is required' });
        }

        const normalizedEmail = rawEmail.trim().toLowerCase();
        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({ message: 'Valid email is required' });
        }

        const now = new Date();

        const bookings = await prisma.schedulingBooking.findMany({
            where: confirmedBookingsWhere(parsedAppSource.appSource),
            select: {
                name: true,
                email: true,
                startTime: true,
                endTime: true,
            },
            orderBy: { startTime: 'asc' },
        });

        const matched = bookings.filter(
            (booking) => booking.email.trim().toLowerCase() === normalizedEmail
        );

        let completedBookings = 0;
        let upcomingBookings = 0;
        let completedHours = 0;
        let upcomingHours = 0;
        let totalHours = 0;

        for (const booking of matched) {
            const hours = bookingDurationHours(booking.startTime, booking.endTime);
            totalHours += hours;

            if (booking.endTime.getTime() <= now.getTime()) {
                completedBookings += 1;
                completedHours += hours;
            } else {
                upcomingBookings += 1;
                upcomingHours += hours;
            }
        }

        const lastCompleted = matched
            .filter((booking) => booking.endTime.getTime() <= now.getTime())
            .sort((a, b) => b.endTime.getTime() - a.endTime.getTime())[0] || null;

        const sessionCredit = await prisma.schedulingSessionCredit.findUnique({
            where: {
                email_appSource: {
                    email: normalizedEmail,
                    appSource: parsedAppSource.appSource,
                },
            },
            select: {
                totalSessions: true,
                usedSessions: true,
            },
        });

        const packageSessionsLeft = getRemainingSessions(sessionCredit);
        const packageSessionsTotal = sessionCredit?.totalSessions ?? 0;
        const packageSessionsUsed = sessionCredit?.usedSessions ?? 0;

        res.status(200).json({
            email: normalizedEmail,
            name: matched.length > 0 ? matched[matched.length - 1].name : null,
            totalBookings: matched.length,
            totalHours,
            completedBookings,
            completedHours,
            upcomingBookings,
            upcomingHours,
            packageSessionsTotal,
            packageSessionsUsed,
            packageSessionsLeft,
            firstBookingAt: matched.length > 0 ? matched[0].startTime.toISOString() : null,
            lastBookingAt: matched.length > 0 ? matched[matched.length - 1].startTime.toISOString() : null,
            lastCompletedMeeting: lastCompleted
                ? {
                    startTime: lastCompleted.startTime.toISOString(),
                    endTime: lastCompleted.endTime.toISOString(),
                }
                : null,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function hmToMinutes(hm) {
    const parsed = parseHm(hm);
    if (!parsed) return null;
    return parsed.h * 60 + parsed.m;
}

function toAvailabilitySettingDto(row) {
    return {
        id: row.id,
        dayOfWeek: row.dayOfWeek,
        dayName: DAY_NAMES[row.dayOfWeek] ?? 'Unknown',
        startTime: row.startTime,
        endTime: row.endTime,
    };
}

function parseAvailabilityInput(body) {
    const dayOfWeek = body?.dayOfWeek;
    const startTime = body?.startTime;
    const endTime = body?.endTime;

    const parsedDay = Number(dayOfWeek);
    if (!Number.isInteger(parsedDay) || parsedDay < 0 || parsedDay > 6) {
        return { error: 'dayOfWeek must be an integer from 0 (Sunday) to 6 (Saturday)' };
    }
    const startParsed = parseHm(startTime);
    const endParsed = parseHm(endTime);
    if (!startParsed || !endParsed) {
        return { error: 'startTime and endTime must be HH:MM in UTC (e.g. "09:00")' };
    }
    if (startParsed.m !== 0 || endParsed.m !== 0) {
        return { error: 'startTime and endTime must be on the hour (:00 minutes)' };
    }

    const startMinutes = hmToMinutes(startTime);
    const endMinutes = hmToMinutes(endTime);
    if (endMinutes <= startMinutes) {
        return { error: 'endTime must be after startTime' };
    }

    return {
        data: {
            dayOfWeek: parsedDay,
            startTime,
            endTime,
        },
    };
}

async function assertNoAvailabilityOverlap(db, { dayOfWeek, startTime, endTime, excludeId = null }) {
    const startMinutes = hmToMinutes(startTime);
    const endMinutes = hmToMinutes(endTime);

    const existingRows = await db.schedulingAvailability.findMany({
        where: {
            dayOfWeek,
            ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
        select: { id: true, startTime: true, endTime: true },
    });

    for (const row of existingRows) {
        const rowStart = hmToMinutes(row.startTime);
        const rowEnd = hmToMinutes(row.endTime);
        if (rowStart == null || rowEnd == null) continue;
        if (startMinutes < rowEnd && rowStart < endMinutes) {
            const err = new Error(
                `This window overlaps an existing window on the same day (${row.startTime}–${row.endTime} UTC)`
            );
            err.statusCode = 409;
            throw err;
        }
    }
}

export const getAvailabilitySettings = async (req, res, next) => {
    try {
        const rows = await prisma.schedulingAvailability.findMany({
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        });

        res.status(200).json({
            availability: rows.map(toAvailabilitySettingDto),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const createAvailabilitySetting = async (req, res, next) => {
    try {
        const parsed = parseAvailabilityInput(req.body);
        if (parsed.error) {
            return res.status(400).json({ message: parsed.error });
        }

        await assertNoAvailabilityOverlap(prisma, parsed.data);

        const created = await prisma.schedulingAvailability.create({
            data: parsed.data,
        });

        res.status(201).json({
            availability: toAvailabilitySettingDto(created),
        });
    } catch (error) {
        if (error?.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateAvailabilitySetting = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (typeof id !== 'string' || !id.trim()) {
            return res.status(400).json({ message: 'Availability id is required' });
        }

        const parsed = parseAvailabilityInput(req.body);
        if (parsed.error) {
            return res.status(400).json({ message: parsed.error });
        }

        const existing = await prisma.schedulingAvailability.findUnique({
            where: { id: id.trim() },
            select: { id: true },
        });
        if (!existing) {
            return res.status(404).json({ message: 'Availability not found' });
        }

        await assertNoAvailabilityOverlap(prisma, {
            ...parsed.data,
            excludeId: id.trim(),
        });

        const updated = await prisma.schedulingAvailability.update({
            where: { id: id.trim() },
            data: parsed.data,
        });

        res.status(200).json({
            availability: toAvailabilitySettingDto(updated),
        });
    } catch (error) {
        if (error?.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteAvailabilitySetting = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (typeof id !== 'string' || !id.trim()) {
            return res.status(400).json({ message: 'Availability id is required' });
        }

        const availabilityId = id.trim();

        const existing = await prisma.schedulingAvailability.findUnique({
            where: { id: availabilityId },
            select: { id: true },
        });
        if (!existing) {
            return res.status(404).json({ message: 'Availability not found' });
        }

        const linkedBookings = await prisma.schedulingBooking.count({
            where: { availabilityId },
        });
        if (linkedBookings > 0) {
            return res.status(409).json({
                message: 'Cannot delete: this window has linked bookings',
            });
        }

        await prisma.schedulingAvailability.delete({
            where: { id: availabilityId },
        });

        res.status(200).json({ success: true, id: availabilityId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

function buildInviteShareUrl(inviteId, appSource = 'phd-success') {
    const { schedulingAppUrl } = getSchedulingStripeConfig(appSource);
    return `${schedulingAppUrl}/?invite=${encodeURIComponent(inviteId)}`;
}

export const createSchedulingInvite = async (req, res, next) => {
    try {
        const { email, type, appSource: rawAppSource } = req.body || {};
        const appSource = normalizeAppSource(rawAppSource);
        if (!appSource) {
            return res.status(400).json({ message: 'appSource is required (phd-success or rise)' });
        }

        if (typeof email !== 'string' || !isValidInviteEmail(email)) {
            return res.status(400).json({ message: 'Valid email is required' });
        }

        const inviteType = typeof type === 'string' ? type.trim().toLowerCase() : '';
        if (inviteType !== 'paid' && inviteType !== 'free') {
            return res.status(400).json({ message: 'type must be "paid" or "free"' });
        }

        const now = new Date();
        const expiresAt =
            inviteType === 'free' ? new Date(now.getTime() + FREE_INVITE_DURATION_MS) : null;

        const invite = await prisma.schedulingInvite.create({
            data: {
                email: normalizeInviteEmail(email),
                type: inviteType,
                expiresAt,
            },
        });

        res.status(201).json({
            invite: toInviteDto(invite, buildInviteShareUrl(invite.id, appSource)),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getSchedulingInvite = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (typeof id !== 'string' || !id.trim()) {
            return res.status(400).json({ message: 'Invite id is required' });
        }

        const invite = await prisma.schedulingInvite.findUnique({
            where: { id: id.trim() },
            include: { sessionCredit: true },
        });

        if (!invite) {
            return res.status(404).json({ message: 'Invite not found' });
        }

        const sessionCredit = invite.sessionCredit ?? null;
        const appSource = sessionCredit?.appSource ?? 'phd-success';
        const status = getInviteStatus(invite, new Date(), sessionCredit);
        res.status(200).json({
            invite: {
                ...toInviteDto(invite, buildInviteShareUrl(invite.id, appSource), sessionCredit),
                status,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

function toMeetingDto(booking) {
    return {
        id: booking.id,
        name: booking.name,
        email: booking.email,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        meetLink: booking.meetLink,
        googleEventId: booking.googleEventId,
        availabilityId: booking.availabilityId,
        status: booking.status,
    };
}

async function resolveAvailabilityIdForStartTime(db, startTime) {
    const instant = startTime instanceof Date ? startTime : new Date(startTime);
    const targetDayStartUtc = new Date(Date.UTC(
        instant.getUTCFullYear(),
        instant.getUTCMonth(),
        instant.getUTCDate(),
        0, 0, 0, 0
    ));
    const targetDayOfWeek = targetDayStartUtc.getUTCDay();
    const normalizedStart = slotStartKey(instant);

    const availabilityRows = await db.schedulingAvailability.findMany({
        where: { dayOfWeek: targetDayOfWeek },
        select: { id: true, startTime: true, endTime: true },
    });

    for (const row of availabilityRows) {
        const windowStart = toUtcOnTargetDay(targetDayStartUtc, row.startTime);
        const windowEnd = toUtcOnTargetDay(targetDayStartUtc, row.endTime);
        if (!windowStart || !windowEnd) continue;
        if (windowEnd.getTime() <= windowStart.getTime()) continue;

        for (let slotStart = new Date(windowStart);;) {
            const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MS);
            if (slotEnd.getTime() > windowEnd.getTime()) break;
            if (slotStartKey(slotStart) === normalizedStart) {
                return row.id;
            }
            slotStart = new Date(slotStart.getTime() + SLOT_DURATION_MS);
        }
    }

    return null;
}

export const getManageableMeetings = async (req, res, next) => {
    try {
        const parsedAppSource = parseAppSourceQuery(req.query);
        if (parsedAppSource.error) {
            return res.status(400).json({ message: parsedAppSource.error });
        }

        const now = new Date();
        const parsedOffset = parseInt(req.query.offset, 10);
        const parsedLimit = parseInt(req.query.limit, 10);
        const offset = Number.isNaN(parsedOffset) ? 0 : Math.max(0, parsedOffset);
        const limitCandidate = Number.isNaN(parsedLimit) ? 20 : parsedLimit;
        const limit = Math.min(100, limitCandidate <= 0 ? 20 : limitCandidate);

        const where = confirmedBookingsWhere(parsedAppSource.appSource, { endTime: { gt: now } });
        const [totalCount, meetings] = await Promise.all([
            prisma.schedulingBooking.count({ where }),
            prisma.schedulingBooking.findMany({
                where,
                orderBy: { startTime: 'asc' },
                skip: offset,
                take: limit,
            }),
        ]);

        res.status(200).json({
            meetings: meetings.map(toMeetingDto),
            pagination: {
                offset,
                limit,
                totalCount,
                hasMore: offset + meetings.length < totalCount,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const cancelMeeting = async (req, res, next) => {
    try {
        const parsedAppSource = parseAppSourceQuery(req.query);
        if (parsedAppSource.error) {
            return res.status(400).json({ message: parsedAppSource.error });
        }

        const { id } = req.params;
        if (typeof id !== 'string' || !id.trim()) {
            return res.status(400).json({ message: 'Meeting id is required' });
        }

        const booking = await prisma.schedulingBooking.findFirst({
            where: { id: id.trim(), appSource: parsedAppSource.appSource },
        });

        if (!booking) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        if (booking.status !== 'confirmed') {
            return res.status(409).json({ message: 'Only confirmed meetings can be cancelled' });
        }

        if (booking.googleEventId) {
            try {
                await deleteMeetEventForBooking(booking);
            } catch (calendarError) {
                console.error('Failed to delete Google Calendar event:', calendarError);
                return res.status(502).json({
                    message: 'Failed to remove Google Calendar event. Meeting was not cancelled.',
                });
            }
        }

        const updated = await prisma.schedulingBooking.update({
            where: { id: booking.id },
            data: {
                status: 'cancelled',
                meetLink: null,
                googleEventId: null,
            },
        });

        try {
            await sendMeetingCancelledEmails(booking);
        } catch (emailError) {
            console.error('Failed to send meeting cancelled emails:', emailError);
        }

        res.status(200).json({
            meeting: toMeetingDto(updated),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const rescheduleMeeting = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { startTime, availabilityId: bodyAvailabilityId, appSource: rawAppSource } = req.body || {};
        const parsedAppSource = parseAppSourceBody({ appSource: rawAppSource });
        if (parsedAppSource.error) {
            return res.status(400).json({ message: parsedAppSource.error });
        }

        if (typeof id !== 'string' || !id.trim()) {
            return res.status(400).json({ message: 'Meeting id is required' });
        }
        if (typeof startTime !== 'string' || !startTime.includes('Z')) {
            return res.status(400).json({ message: 'startTime must be a UTC ISO string ending with Z' });
        }

        const booking = await prisma.schedulingBooking.findFirst({
            where: { id: id.trim(), appSource: parsedAppSource.appSource },
        });

        if (!booking) {
            return res.status(404).json({ message: 'Meeting not found' });
        }
        if (booking.status !== 'confirmed') {
            return res.status(409).json({ message: 'Only confirmed meetings can be rescheduled' });
        }

        const parsedStart = new Date(startTime);
        if (Number.isNaN(parsedStart.getTime())) {
            return res.status(400).json({ message: 'Invalid startTime' });
        }

        const normalizedStart = slotStartKey(parsedStart);
        const newStart = new Date(normalizedStart);
        const newEnd = new Date(normalizedStart + SLOT_DURATION_MS);
        const now = new Date();

        if (newStart.getTime() <= now.getTime()) {
            return res.status(400).json({ message: 'New start time must be in the future' });
        }

        let availabilityId = typeof bodyAvailabilityId === 'string' && bodyAvailabilityId.trim()
            ? bodyAvailabilityId.trim()
            : await resolveAvailabilityIdForStartTime(prisma, newStart);

        if (!availabilityId) {
            return res.status(400).json({ message: 'New time is outside configured availability windows' });
        }

        const availabilityRow = await prisma.schedulingAvailability.findUnique({
            where: { id: availabilityId },
            select: { id: true },
        });
        if (!availabilityRow) {
            return res.status(400).json({ message: 'Invalid availabilityId' });
        }

        let updatedBooking;
        try {
            updatedBooking = await prisma.$transaction(async (tx) => {
                await assertSlotAvailable(tx, {
                    startTime: newStart,
                    now,
                    excludeBookingId: booking.id,
                });

                return tx.schedulingBooking.update({
                    where: { id: booking.id },
                    data: {
                        startTime: newStart,
                        endTime: newEnd,
                        availabilityId,
                    },
                });
            });
        } catch (error) {
            if (error?.code === 'P2002') {
                return res.status(409).json({ message: 'Slot is already reserved or booked' });
            }
            if (error?.statusCode) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            throw error;
        }

        if (updatedBooking.googleEventId) {
            try {
                const calendarResult = await updateMeetEventForBooking(updatedBooking);
                updatedBooking = await prisma.schedulingBooking.update({
                    where: { id: updatedBooking.id },
                    data: { meetLink: calendarResult.meetLink },
                });
            } catch (calendarError) {
                console.error('Failed to update Google Calendar event:', calendarError);
                await prisma.schedulingBooking.update({
                    where: { id: booking.id },
                    data: {
                        startTime: booking.startTime,
                        endTime: booking.endTime,
                        availabilityId: booking.availabilityId,
                    },
                });
                return res.status(502).json({
                    message: 'Failed to update Google Calendar event. Meeting time was reverted.',
                });
            }
        }

        try {
            await sendMeetingRescheduledEmails(updatedBooking, {
                startTime: booking.startTime,
                endTime: booking.endTime,
            });
        } catch (emailError) {
            console.error('Failed to send meeting rescheduled emails:', emailError);
        }

        res.status(200).json({
            meeting: toMeetingDto(updatedBooking),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const grantSessionCredits = async (req, res, next) => {
    try {
        const { email, sessions: rawSessions, appSource: rawAppSource, notes, sendEmail } = req.body || {};
        const appSource = normalizeAppSource(rawAppSource);
        if (!appSource) {
            return res.status(400).json({ message: 'appSource is required (phd-success or rise)' });
        }

        if (typeof email !== 'string' || !isValidInviteEmail(email)) {
            return res.status(400).json({ message: 'Valid email is required' });
        }

        const parsedSessions = parseSessionGrantCount(rawSessions);
        if (parsedSessions.error) {
            return res.status(400).json({ message: parsedSessions.error });
        }

        const normalizedEmail = normalizeInviteEmail(email);
        const trimmedNotes =
            typeof notes === 'string' && notes.trim() ? notes.trim() : null;
        const shouldSendEmail = sendEmail !== false;

        const result = await prisma.$transaction(async (tx) => {
            let credit = await tx.schedulingSessionCredit.findUnique({
                where: {
                    email_appSource: {
                        email: normalizedEmail,
                        appSource,
                    },
                },
            });

            const isTopUp = Boolean(credit);
            let invite;

            if (credit) {
                credit = await tx.schedulingSessionCredit.update({
                    where: { id: credit.id },
                    data: {
                        totalSessions: { increment: parsedSessions.sessions },
                        ...(trimmedNotes
                            ? {
                                  notes: credit.notes
                                      ? `${credit.notes}\n${trimmedNotes}`
                                      : trimmedNotes,
                              }
                            : {}),
                    },
                });

                if (credit.inviteId) {
                    invite = await tx.schedulingInvite.findUnique({
                        where: { id: credit.inviteId },
                    });
                    if (invite?.usedAt) {
                        invite = await tx.schedulingInvite.update({
                            where: { id: invite.id },
                            data: { usedAt: null },
                        });
                    }
                }
            } else {
                invite = await tx.schedulingInvite.create({
                    data: {
                        email: normalizedEmail,
                        type: 'package',
                        expiresAt: null,
                    },
                });

                credit = await tx.schedulingSessionCredit.create({
                    data: {
                        email: normalizedEmail,
                        appSource,
                        totalSessions: parsedSessions.sessions,
                        notes: trimmedNotes,
                        inviteId: invite.id,
                    },
                });
            }

            if (!invite && credit.inviteId) {
                invite = await tx.schedulingInvite.findUnique({
                    where: { id: credit.inviteId },
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
                credit = await tx.schedulingSessionCredit.update({
                    where: { id: credit.id },
                    data: { inviteId: invite.id },
                });
            }

            return { credit, invite, isTopUp };
        });

        const shareUrl = buildInviteShareUrl(result.invite.id, appSource);
        let emailResult = { skipped: true, emailSent: false };

        if (shouldSendEmail) {
            try {
                emailResult = await sendSessionPackageGrantedEmail({
                    email: normalizedEmail,
                    sessionsGranted: parsedSessions.sessions,
                    totalRemaining: result.credit.totalSessions - result.credit.usedSessions,
                    shareUrl,
                    isTopUp: result.isTopUp,
                    appSource,
                });
            } catch (emailError) {
                console.error('Failed to send session package email:', emailError);
                emailResult = { skipped: true, emailSent: false, error: emailError.message };
            }
        }

        res.status(201).json({
            credit: toSessionCreditDto(result.credit, shareUrl),
            invite: toInviteDto(result.invite, shareUrl, result.credit),
            emailSent: emailResult.emailSent,
            emailSkipped: emailResult.skipped,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const listSessionCredits = async (req, res, next) => {
    try {
        const parsedAppSource = parseAppSourceQuery(req.query);
        if (parsedAppSource.error) {
            return res.status(400).json({ message: parsedAppSource.error });
        }

        const credits = await prisma.schedulingSessionCredit.findMany({
            where: { appSource: parsedAppSource.appSource },
            orderBy: { email: 'asc' },
            select: {
                email: true,
                totalSessions: true,
                usedSessions: true,
            },
        });

        res.status(200).json({
            credits: credits.map((credit) => ({
                email: credit.email,
                totalSessions: credit.totalSessions,
                usedSessions: credit.usedSessions,
                remainingSessions: getRemainingSessions(credit),
            })),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getSessionCredits = async (req, res, next) => {
    try {
        const parsedAppSource = parseAppSourceQuery(req.query);
        if (parsedAppSource.error) {
            return res.status(400).json({ message: parsedAppSource.error });
        }

        const rawEmail = req.query?.email;
        if (typeof rawEmail !== 'string' || !rawEmail.trim()) {
            return res.status(400).json({ message: 'email query param is required' });
        }

        const normalizedEmail = normalizeInviteEmail(rawEmail);
        if (!isValidInviteEmail(normalizedEmail)) {
            return res.status(400).json({ message: 'Valid email is required' });
        }

        const credit = await prisma.schedulingSessionCredit.findUnique({
            where: {
                email_appSource: {
                    email: normalizedEmail,
                    appSource: parsedAppSource.appSource,
                },
            },
            include: {
                invite: true,
                usages: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    include: {
                        booking: {
                            select: {
                                id: true,
                                startTime: true,
                                endTime: true,
                                status: true,
                            },
                        },
                    },
                },
            },
        });

        if (!credit) {
            return res.status(404).json({ message: 'No session credits found for this email' });
        }

        const shareUrl = credit.inviteId
            ? buildInviteShareUrl(credit.inviteId, parsedAppSource.appSource)
            : null;

        res.status(200).json({
            credit: toSessionCreditDto(credit, shareUrl),
            invite: credit.invite
                ? toInviteDto(credit.invite, shareUrl, credit)
                : null,
            recentUsages: credit.usages.map((usage) => ({
                id: usage.id,
                bookingId: usage.bookingId,
                createdAt: usage.createdAt.toISOString(),
                booking: usage.booking
                    ? {
                          id: usage.booking.id,
                          startTime: usage.booking.startTime.toISOString(),
                          endTime: usage.booking.endTime.toISOString(),
                          status: usage.booking.status,
                      }
                    : null,
            })),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
