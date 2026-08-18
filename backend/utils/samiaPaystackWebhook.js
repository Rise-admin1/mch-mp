import crypto from 'crypto';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { getSamiaPaystackConfig } from './samiaPaystack.js';

function verifySignature(rawBody, signature, secretKey) {
  if (!signature || !secretKey) return false;
  const hash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
  const expected = Buffer.from(hash);
  const received = Buffer.from(String(signature));
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

async function verifyTransaction(reference, secretKey) {
  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    }
  );
  return response.data?.data;
}

export async function upsertPaystackDonation({
  reference,
  amountKes,
  status,
  resultDesc,
}) {
  const prisma = new PrismaClient();
  const existing = await prisma.samiaDonation.findUnique({
    where: { paystackReference: reference },
  });

  if (existing) {
    return prisma.samiaDonation.update({
      where: { paystackReference: reference },
      data: {
        status,
        amount: amountKes ?? existing.amount,
        resultDesc: resultDesc || existing.resultDesc,
      },
    });
  }

  return prisma.samiaDonation.create({
    data: {
      method: 'paystack',
      amount: amountKes ?? 0,
      currency: 'KES',
      status,
      paystackReference: reference,
      resultDesc,
    },
  });
}

export async function handleSamiaPaystackWebhook(req, res) {
  try {
    const { secretKey } = getSamiaPaystackConfig();
    if (!secretKey) {
      return res.status(500).send('Samia Paystack is not configured');
    }

    const signature = req.headers['x-paystack-signature'];
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));

    if (!verifySignature(rawBody, signature, secretKey)) {
      return res.status(400).send('Invalid Paystack signature');
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    if (event?.event !== 'charge.success') {
      return res.json({ received: true });
    }

    const reference = event?.data?.reference;
    if (!reference) {
      return res.status(400).send('Missing transaction reference');
    }

    const verified = await verifyTransaction(reference, secretKey);
    const succeeded = verified?.status === 'success';
    const amountKes =
      typeof verified?.amount === 'number' ? verified.amount / 100 : undefined;

    await upsertPaystackDonation({
      reference,
      amountKes,
      status: succeeded ? 'success' : 'failed',
      resultDesc: verified?.status || event.event,
    });

    return res.json({ received: true });
  } catch (error) {
    console.error('Samia Paystack webhook error:', error);
    return res.status(500).send('Webhook handler failed');
  }
}
