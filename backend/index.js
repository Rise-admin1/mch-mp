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
import { getGoogleAuthUrl, exchangeCodeForTokens, upsertGoogleRefreshToken } from './utils/googleCalendar.js';
import { getSchedulingStripeConfig } from './utils/schedulingStripe.js';
import { handleSchedulingStripeWebhook } from './utils/schedulingWebhook.js';
import { deleteExpiredGuestUsers, deleteExpiredVaultSessions } from './middleware/vaultAuth.js';
dotenv.config();
const app = express();

app.use(cors(corsOptions));

const phdStripeConfig = getSchedulingStripeConfig('phd-success');
const riseStripeConfig = getSchedulingStripeConfig('rise');

// Stripe webhook for PhD Success scheduling
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) =>
  handleSchedulingStripeWebhook(req, res, {
    stripe: phdStripeConfig.stripe,
    webhookSecret: phdStripeConfig.webhookSecret,
    defaultAppSource: 'phd-success',
  })
);

// Stripe webhook for RISE Scheduler
app.post('/api/stripe/rise/webhook', express.raw({ type: 'application/json' }), (req, res) =>
  handleSchedulingStripeWebhook(req, res, {
    stripe: riseStripeConfig.stripe,
    webhookSecret: riseStripeConfig.webhookSecret,
    defaultAppSource: 'rise',
  })
);

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
  const cleanupVault = () =>
    Promise.all([deleteExpiredVaultSessions(), deleteExpiredGuestUsers()]);
  cleanupVault().catch((err) => {
    console.error('Failed to clean up expired vault sessions/guests:', err);
  });
  setInterval(() => {
    cleanupVault().catch((err) => {
      console.error('Failed to clean up expired vault sessions/guests:', err);
    });
  }, 60 * 60 * 1000);
})