import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'
import dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient();


const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeSuccessUrl = process.env.STRIPE_SUCCESS_URL;
const stripeCancelUrl = process.env.STRIPE_CANCEL_URL;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

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

        const parseHm = (hm) => {
            const match = /^(\d{1,2}):(\d{2})$/.exec(hm);
            if (!match) return null;
            const h = Number(match[1]);
            const m = Number(match[2]);
            if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
            return { h, m };
        };

        const toUtcOnTargetDay = (hm) => {
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
        };

        const generatedSlots = [];

        for (const row of availabilityRows) {
            const windowStart = toUtcOnTargetDay(row.startTime);
            const windowEnd = toUtcOnTargetDay(row.endTime);
            if (!windowStart || !windowEnd) continue;
            if (windowEnd.getTime() <= windowStart.getTime()) continue;

            for (let slotStart = new Date(windowStart);;) {
                const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
                if (slotEnd.getTime() > windowEnd.getTime()) break;
                generatedSlots.push({ startTime: slotStart, endTime: slotEnd, availabilityId: row.id });
                slotStart = new Date(slotStart.getTime() + 60 * 60 * 1000);
            }
        }

        const sameUtcDayAsNow =
            targetDayStartUtc.getUTCFullYear() === nowInstant.getUTCFullYear() &&
            targetDayStartUtc.getUTCMonth() === nowInstant.getUTCMonth() &&
            targetDayStartUtc.getUTCDate() === nowInstant.getUTCDate();

        let ceilNowToHourUtc = null;
        if (sameUtcDayAsNow) {
            ceilNowToHourUtc = new Date(Date.UTC(
                nowInstant.getUTCFullYear(),
                nowInstant.getUTCMonth(),
                nowInstant.getUTCDate(),
                nowInstant.getUTCHours(),
                0,
                0,
                0
            ));
            if (
                nowInstant.getUTCMinutes() !== 0 ||
                nowInstant.getUTCSeconds() !== 0 ||
                nowInstant.getUTCMilliseconds() !== 0
            ) {
                ceilNowToHourUtc = new Date(ceilNowToHourUtc.getTime() + 60 * 60 * 1000);
            }
        }

        let candidateSlots = generatedSlots;
        if (ceilNowToHourUtc) {
            candidateSlots = candidateSlots.filter(s => s.startTime.getTime() >= ceilNowToHourUtc.getTime());
        }

        const bookings = await prisma.schedulingBooking.findMany({
            where: {
                startTime: { gte: targetDayStartUtc, lt: targetDayEndUtc }
            },
            select: { startTime: true, status: true, expiresAt: true }
        });

        const bookedStarts = new Set(
            bookings
                .filter(b => {
                    if (b.status === 'confirmed') return true;
                    if (b.status === 'pending' && b.expiresAt && b.expiresAt.getTime() > nowInstant.getTime()) return true;
                    return false;
                })
                .map(b => b.startTime.toISOString())
        );

        const slots = candidateSlots
            .filter(s => !bookedStarts.has(s.startTime.toISOString()))
            .map(s => ({
                availabilityId: s.availabilityId,
                startTime: s.startTime.toISOString(),
                endTime: s.endTime.toISOString()
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

        if (!stripe || !stripeSuccessUrl || !stripeCancelUrl) {
            return res.status(500).json({ message: 'Stripe is not configured' });
        }

        const { name, email, notes, startTime, availabilityId } = req.body || {};

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

        const start = new Date(startTime);
        if (Number.isNaN(start.getTime())) {
            return res.status(400).json({ message: 'Invalid startTime' });
        }
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        const now = new Date();
        const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

        const booking = await prisma.$transaction(async (tx) => {
            // Ensure availability exists
            const availability = await tx.schedulingAvailability.findUnique({
                where: { id: availabilityId },
                select: { id: true }
            });
            if (!availability) {
                const err = new Error('Availability not found');
                err.statusCode = 404;
                throw err;
            }

            // Create the hold (unique constraint prevents double-holds on same slot)
            const created = await tx.schedulingBooking.create({
                data: {
                    name: name.trim(),
                    email: email.trim(),
                    startTime: start,
                    endTime: end,
                    status: 'pending',
                    expiresAt,
                    availabilityId: availabilityId.trim(),
                },
                select: { id: true }
            });

            const session = await stripe.checkout.sessions.create({
                mode: 'payment',
                customer_email: email.trim(),
                client_reference_id: created.id,
                metadata: { bookingId: created.id },
                success_url: stripeSuccessUrl,
                cancel_url: stripeCancelUrl,
                line_items: [
                    {
                        quantity: 1,
                        price_data: {
                            currency: 'aed',
                            unit_amount: 38500,
                            product_data: { name: 'PhD Success Scheduling Session' }
                        }
                    }
                ]
            });

            await tx.schedulingBooking.update({
                where: { id: created.id },
                data: { stripeSessionId: session.id }
            });

            return { id: created.id, url: session.url };
        });

        res.status(200).json({ bookingId: booking.id, url: booking.url });
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