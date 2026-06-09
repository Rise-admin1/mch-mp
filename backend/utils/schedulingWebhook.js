import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { releaseExpiredHolds } from './schedulingHolds.js';
import { createMeetEventForBooking } from './googleCalendar.js';
import { sendMeetingScheduledEmails } from './meetingEmails.js';
import { purgeBookingAttachments } from './schedulingUploads.js';
import { normalizeAppSource } from './schedulingStripe.js';

export async function handleSchedulingStripeWebhook(req, res, { stripe, webhookSecret, defaultAppSource }) {
    try {
        if (!stripe || !webhookSecret) {
            return res.status(500).send('Stripe is not configured in webhook check');
        }

        const sig = req.headers['stripe-signature'];
        if (!sig) {
            return res.status(400).send('Missing stripe-signature header');
        }

        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch (err) {
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        const relevantTypes = new Set([
            'checkout.session.completed',
            'checkout.session.async_payment_succeeded',
        ]);
        if (!relevantTypes.has(event.type)) {
            return res.json({ received: true });
        }

        const session = event.data.object;
        if (event.type === 'checkout.session.completed' && session?.payment_status !== 'paid') {
            return res.json({ received: true });
        }

        const bookingId = session?.metadata?.bookingId || session?.client_reference_id;
        const inviteId = session?.metadata?.inviteId;
        const appSource = normalizeAppSource(session?.metadata?.appSource) || defaultAppSource;
        const stripeSessionId = session?.id;
        const paymentIntentId = session?.payment_intent;
        const amountPaid = typeof session?.amount_total === 'number' ? session.amount_total : 38500;

        if (!bookingId && !stripeSessionId) {
            return res.status(400).send('Missing booking identifier');
        }

        const prisma = new PrismaClient();
        const now = new Date();
        await releaseExpiredHolds(prisma, now);

        const updatedBookingId = await prisma.$transaction(async (tx) => {
            const booking = bookingId
                ? await tx.schedulingBooking.findUnique({ where: { id: bookingId } })
                : await tx.schedulingBooking.findUnique({ where: { stripeSessionId } });

            if (!booking) return;

            const refreshedBooking = await tx.schedulingBooking.findUnique({ where: { id: booking.id } });
            if (!refreshedBooking) return;

            if (
                refreshedBooking.status === 'pending' &&
                refreshedBooking.expiresAt &&
                refreshedBooking.expiresAt.getTime() <= now.getTime()
            ) {
                return;
            }

            await tx.schedulingBooking.update({
                where: { id: refreshedBooking.id },
                data: {
                    status: 'confirmed',
                    stripeSessionId: refreshedBooking.stripeSessionId || stripeSessionId,
                    expiresAt: null,
                    appSource: refreshedBooking.appSource || appSource,
                },
            });

            await tx.schedulingPayment.upsert({
                where: { bookingId: refreshedBooking.id },
                create: {
                    bookingId: refreshedBooking.id,
                    stripeId: String(paymentIntentId || stripeSessionId || ''),
                    amount: amountPaid,
                    status: 'paid',
                },
                update: {
                    stripeId: String(paymentIntentId || stripeSessionId || ''),
                    amount: amountPaid,
                    status: 'paid',
                },
            });

            if (inviteId) {
                const invite = await tx.schedulingInvite.findUnique({
                    where: { id: inviteId },
                    select: { id: true, type: true },
                });

                if (invite?.type === 'package') {
                    const credit = await tx.schedulingSessionCredit.findUnique({
                        where: { inviteId },
                    });

                    if (credit) {
                        const remaining = credit.totalSessions - credit.usedSessions;
                        if (remaining > 0) {
                            await tx.schedulingSessionCredit.update({
                                where: { id: credit.id },
                                data: { usedSessions: { increment: 1 } },
                            });
                            await tx.schedulingSessionCreditUsage.create({
                                data: {
                                    creditId: credit.id,
                                    bookingId: refreshedBooking.id,
                                },
                            });

                            if (credit.usedSessions + 1 >= credit.totalSessions) {
                                await tx.schedulingInvite.updateMany({
                                    where: { id: inviteId, usedAt: null },
                                    data: { usedAt: now },
                                });
                            }
                        }
                    }
                } else {
                    await tx.schedulingInvite.updateMany({
                        where: { id: inviteId, usedAt: null },
                        data: {
                            usedAt: now,
                            bookingId: refreshedBooking.id,
                        },
                    });
                }
            }

            return refreshedBooking.id;
        }, { maxWait: 10000, timeout: 20000 });

        if (updatedBookingId) {
            let booking = await prisma.schedulingBooking.findUnique({ where: { id: updatedBookingId } });
            if (booking && booking.status === 'confirmed' && !booking.meetLink) {
                try {
                    const { googleEventId, meetLink } = await createMeetEventForBooking(booking);
                    if (meetLink) {
                        await prisma.schedulingBooking.updateMany({
                            where: { id: booking.id, meetLink: null },
                            data: { meetLink, googleEventId },
                        });
                        booking = await prisma.schedulingBooking.findUnique({ where: { id: updatedBookingId } });
                    }
                } catch (e) {
                    console.error('Failed to create Google Meet link:', e?.message || e);
                }
            }

            if (booking && booking.status === 'confirmed' && !booking.emailsSentAt) {
                try {
                    const bookingForEmail = await prisma.schedulingBooking.findUnique({
                        where: { id: booking.id },
                        include: { attachments: true },
                    });
                    if (bookingForEmail) {
                        const emailResult = await sendMeetingScheduledEmails(bookingForEmail);
                        if (!emailResult.skipped) {
                            await purgeBookingAttachments(prisma, booking.id);
                            await prisma.schedulingBooking.update({
                                where: { id: booking.id },
                                data: { emailsSentAt: new Date() },
                            });
                        }
                    }
                } catch (e) {
                    console.error('Failed to send meeting scheduled emails:', e?.message || e);
                }
            }
        }

        return res.json({ received: true });
    } catch (e) {
        console.error(e);
        return res.status(500).send('Internal server error');
    }
}
