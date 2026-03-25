import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import volunteerRouter from './route/volunteer-Route.js';
import africastalkingRouter from './route/africastalking-Route.js';
import dajariaRouter from './route/dajaria-router.js';
import metaRouter from './route/meta-Route.js';
import { corsOptions } from './utils/corsFe.js';
import { errorHandler } from './middleware/errorHandler.js';
import chalk from 'chalk';
import schedulingRouter from './route/scheduling-route.js';
import Stripe from 'stripe';
import { getGoogleAuthUrl, exchangeCodeForTokens, upsertGoogleRefreshToken, createMeetEventForBooking } from './utils/googleCalendar.js';
dotenv.config();
const app = express();

app.use(cors(corsOptions));

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe webhook for phd success scheduling
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!stripe || !stripeWebhookSecret) {
      return res.status(500).send('Stripe is not configured in webhook check');
    }

    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).send('Missing stripe-signature header');
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
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
    // For some payment methods, "completed" can happen before funds are captured.
    // Only treat it as paid when payment_status is "paid" (or async_payment_succeeded fires).
    if (event.type === 'checkout.session.completed' && session?.payment_status !== 'paid') {
      return res.json({ received: true });
    }

    const bookingId = session?.metadata?.bookingId || session?.client_reference_id;
    const stripeSessionId = session?.id;
    const paymentIntentId = session?.payment_intent;

    if (!bookingId && !stripeSessionId) {
      return res.status(400).send('Missing booking identifier');
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const updatedBookingId = await prisma.$transaction(async (tx) => {
      const booking = bookingId
        ? await tx.schedulingBooking.findUnique({ where: { id: bookingId } })
        : await tx.schedulingBooking.findUnique({ where: { stripeSessionId } });

      if (!booking) return;

      const now = new Date();
      if (booking.status === 'pending' && booking.expiresAt && booking.expiresAt.getTime() <= now.getTime()) {
        await tx.schedulingBooking.update({
          where: { id: booking.id },
          data: { status: 'expired' }
        });
        return;
      }

      await tx.schedulingBooking.update({
        where: { id: booking.id },
        data: {
          status: 'confirmed',
          stripeSessionId: booking.stripeSessionId || stripeSessionId,
          expiresAt: null,
        }
      });

      // Record payment (amount is fixed at 38500 minor units) for phd success scheduling
      await tx.schedulingPayment.upsert({
        where: { bookingId: booking.id },
        create: {
          bookingId: booking.id,
          stripeId: String(paymentIntentId || stripeSessionId || ''),
          amount: 38500,
          status: 'paid',
        },
        update: {
          stripeId: String(paymentIntentId || stripeSessionId || ''),
          amount: 38500,
          status: 'paid',
        }
      });

      return booking.id;
    });

    if (updatedBookingId) {
      const booking = await prisma.schedulingBooking.findUnique({ where: { id: updatedBookingId } });
      if (booking && booking.status === 'confirmed' && !booking.meetLink) {
        try {
          const { googleEventId, meetLink } = await createMeetEventForBooking(booking);
          if (meetLink) {
            await prisma.schedulingBooking.updateMany({
              where: { id: booking.id, meetLink: null },
              data: { meetLink, googleEventId },
            });
          }
        } catch (e) {
          console.error('Failed to create Google Meet link:', e?.message || e);
        }
      }
    }

    return res.json({ received: true });
  } catch (e) {
    console.error(e);
    return res.status(500).send('Internal server error');
  }
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Admin connect flow for Google Calendar (personal Gmail OAuth)
app.get('/auth/google', (req, res) => {
  try {
    const url = getGoogleAuthUrl();
    return res.redirect(url);
  } catch (e) {
    console.error(e);
    return res.status(500).send('Google OAuth is not configured');
  }
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const code = req.query?.code;
    if (!code || typeof code !== 'string') {
      return res.status(400).send('Missing code');
    }
    const tokens = await exchangeCodeForTokens(code);
    if (tokens.refresh_token) {
      await upsertGoogleRefreshToken(tokens.refresh_token);
      return res.status(200).send('Google Calendar connected. Refresh token saved.');
    }
    return res
      .status(200)
      .send(
        'Google Calendar connected, but no refresh token was returned. Revoke access in your Google Account and try again with prompt=consent.'
      );
  } catch (e) {
    console.error(e);
    return res.status(500).send('Failed to complete Google OAuth');
  }
});

app.use('/api/volunteer', volunteerRouter);
app.use('/api/africastalking',africastalkingRouter);
app.use('/api/dajaria',dajariaRouter);
app.use('/api/rise-reports', metaRouter);

app.use('/api/scheduling', schedulingRouter);


app.use(errorHandler);
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(chalk.blue.bgRed(`Backend running at port ${PORT}`));
})