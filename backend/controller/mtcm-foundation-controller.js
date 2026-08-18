import { PrismaClient } from '@prisma/client'
import axios from "axios";
import { normalizePhoneNumber } from "../utils/mpesaDaraja.js";
import { getSamiaPaystackConfig } from "../utils/samiaPaystack.js";
import { upsertPaystackDonation } from "../utils/samiaPaystackWebhook.js";

const prisma = new PrismaClient();

const MPESA_MIN_AMOUNT = 10;
const PAYSTACK_MIN_AMOUNT = 50;
const MAX_AMOUNT = 5000000;
const METADATA_SOURCE = 'mtcm';

function parseKesAmount(raw, min) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > MAX_AMOUNT) return null;
  return Math.round(n);
}

function toPaystackPhone(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return normalized;
  return String(normalized).startsWith('+') ? String(normalized) : `+${normalized}`;
}

function paystackHeaders(secretKey) {
  return {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  };
}

export const initializePaystack = async (req, res) => {
  try {
    const kesAmount = parseKesAmount(req.body?.amount, PAYSTACK_MIN_AMOUNT);
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (kesAmount === null || !emailOk) {
      return res.status(400).json({
        status: false,
        msg: `Valid email and amount (min ${PAYSTACK_MIN_AMOUNT} KES) are required`,
      });
    }

    const { secretKey } = getSamiaPaystackConfig();
    if (!secretKey) {
      return res.status(503).json({
        status: false,
        msg: "Samia Paystack is not configured. Set SAMIA_PAYSTACK_SECRET_KEY.",
      });
    }

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: kesAmount * 100,
        currency: 'KES',
        channels: ['card'],
        metadata: {
          source: METADATA_SOURCE,
          amountKes: String(kesAmount),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data?.data;
    if (!response.data?.status || !data?.reference || !data?.access_code) {
      return res.status(502).json({
        status: false,
        msg: response.data?.message || 'Paystack did not return a payment session',
      });
    }

    const donation = await prisma.samiaDonation.create({
      data: {
        method: 'paystack',
        amount: kesAmount,
        currency: 'KES',
        status: 'pending',
        paystackReference: data.reference,
        resultDesc: 'initialized',
      },
    });

    return res.status(200).json({
      status: true,
      accessCode: data.access_code,
      reference: data.reference,
      donationId: donation.id,
    });
  } catch (error) {
    console.error('Error initializing MTCM Paystack:', error.response?.data || error);
    return res.status(error.response?.status || 500).json({
      status: false,
      msg: error.response?.data?.message || error.message || 'Failed to start card payment',
    });
  }
};

export const chargePaystackMpesa = async (req, res) => {
  try {
    const kesAmount = parseKesAmount(req.body?.amount, MPESA_MIN_AMOUNT);
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const phoneNumber = toPaystackPhone(req.body?.phoneNumber);

    if (kesAmount === null || !emailOk || !phoneNumber) {
      return res.status(400).json({
        status: false,
        msg: `Valid email, M-Pesa phone, and amount (min ${MPESA_MIN_AMOUNT} KES) are required`,
      });
    }

    const { secretKey } = getSamiaPaystackConfig();
    if (!secretKey) {
      return res.status(503).json({
        status: false,
        msg: "Samia Paystack is not configured. Set SAMIA_PAYSTACK_SECRET_KEY.",
      });
    }

    const response = await axios.post(
      'https://api.paystack.co/charge',
      {
        email,
        amount: kesAmount * 100,
        currency: 'KES',
        mobile_money: {
          phone: phoneNumber,
          provider: 'mpesa',
        },
        metadata: {
          source: METADATA_SOURCE,
          channel: 'mpesa',
          amountKes: String(kesAmount),
        },
      },
      { headers: paystackHeaders(secretKey) }
    );

    const data = response.data?.data;
    const reference = data?.reference;
    if (!response.data?.status || !reference) {
      return res.status(502).json({
        status: false,
        msg: response.data?.message || data?.display_text || 'Paystack did not start the M-Pesa charge',
      });
    }

    await prisma.samiaDonation.create({
      data: {
        method: 'paystack',
        amount: kesAmount,
        currency: 'KES',
        status: 'pending',
        phoneNumber,
        paystackReference: reference,
        resultDesc: data.status || 'pay_offline',
      },
    });

    return res.status(200).json({
      status: true,
      reference,
      msg: data.display_text || 'Check your phone and enter your M-Pesa PIN.',
    });
  } catch (error) {
    console.error('Error charging MTCM Paystack M-Pesa:', error.response?.data || error);
    return res.status(error.response?.status || 500).json({
      status: false,
      msg: error.response?.data?.message || error.message || 'Failed to start M-Pesa payment',
    });
  }
};

export const verifyPaystack = async (req, res) => {
  try {
    const reference = req.params?.reference;
    if (!reference) {
      return res.status(400).json({
        status: false,
        msg: 'Reference is required',
      });
    }

    const { secretKey } = getSamiaPaystackConfig();
    if (!secretKey) {
      return res.status(503).json({
        status: false,
        msg: "Samia Paystack is not configured. Set SAMIA_PAYSTACK_SECRET_KEY.",
      });
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    const verified = response.data?.data;
    const paystackStatus = verified?.status;
    const succeeded = paystackStatus === 'success';
    const failed = ['failed', 'abandoned', 'reversed'].includes(paystackStatus);
    const amountKes =
      typeof verified?.amount === 'number' ? verified.amount / 100 : undefined;

    if (verified?.reference && (succeeded || failed)) {
      await upsertPaystackDonation({
        reference: verified.reference,
        amountKes,
        status: succeeded ? 'success' : 'failed',
        resultDesc: paystackStatus,
      });
    }

    const status = succeeded ? 'success' : failed ? 'failed' : 'pending';
    return res.status(200).json({
      status,
      msg: succeeded
        ? 'Payment successful'
        : failed
          ? 'Payment not completed'
          : 'Waiting for payment confirmation…',
      reference: verified?.reference || reference,
    });
  } catch (error) {
    console.error('Error verifying MTCM Paystack:', error.response?.data || error);
    return res.status(error.response?.status || 500).json({
      status: false,
      msg: error.response?.data?.message || error.message || 'Failed to verify payment',
    });
  }
};
