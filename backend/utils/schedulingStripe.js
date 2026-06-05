import Stripe from 'stripe';

export const SCHEDULING_APP_SOURCES = ['phd-success', 'rise'];

export function normalizeAppSource(value) {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    return SCHEDULING_APP_SOURCES.includes(normalized) ? normalized : null;
}

function readEnv(name) {
    const value = process.env[name];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function getSchedulingStripeConfig(appSource) {
    const normalized = normalizeAppSource(appSource) || 'phd-success';
    const isRise = normalized === 'rise';
    const prefix = isRise ? 'STRIPE_RISE_' : 'STRIPE_';

    const secretKey = readEnv(isRise ? 'STRIPE_RISE_SECRET_KEY' : 'STRIPE_SECRET_KEY');
    const successUrl = readEnv(`${prefix}SUCCESS_URL`);
    const cancelUrl = readEnv(`${prefix}CANCEL_URL`);
    const freeCouponId = readEnv(`${prefix}FREE_COUPON_ID`);
    const priceId = readEnv(`${prefix}PRICE_ID`);
    const webhookSecret = readEnv(isRise ? 'STRIPE_RISE_WEBHOOK_SECRET' : 'STRIPE_WEBHOOK_SECRET');
    const schedulingAppUrl = (
        readEnv(isRise ? 'SCHEDULING_RISE_APP_URL' : 'SCHEDULING_APP_URL')
        || (isRise ? 'http://localhost:5174' : 'http://localhost:5173')
    ).replace(/\/$/, '');

    const stripe = secretKey ? new Stripe(secretKey) : null;

    return {
        appSource: normalized,
        stripe,
        successUrl,
        cancelUrl,
        freeCouponId,
        priceId,
        webhookSecret,
        schedulingAppUrl,
        productName: isRise ? 'RISE Scheduler Session' : 'PhD Success Scheduling Session',
        defaultAmount: isRise ? 38500 : 38500,
    };
}
