import { PrismaClient } from '@prisma/client'
import axios from "axios";
import moment from "moment";
import {
  normalizePhoneNumber,
  isProduction,
  mpesaBaseUrl,
  mpesaConfig,
  getBackendUrl,
  getMpesaAccessToken,
} from "../utils/mpesaDaraja.js";
import { getSamiaPaystackConfig } from "../utils/samiaPaystack.js";
import { upsertPaystackDonation } from "../utils/samiaPaystackWebhook.js";

const prisma = new PrismaClient();

const MPESA_MIN_AMOUNT = 10;
const PAYSTACK_MIN_AMOUNT = 50;
const MAX_AMOUNT = 5000000;

function parseKesAmount(raw, min) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > MAX_AMOUNT) return null;
  return Math.round(n);
}

function getCallbackUrl() {
  return `${getBackendUrl()}/api/samia-future/callback`;
}

function getMetadataValue(name, metadataArray) {
  if (!metadataArray) return null;
  const item = metadataArray.find((entry) => entry.Name === name);
  return item?.Value || null;
}

export const stkpush = async (req, res) => {
  const { phoneNumber, amount } = req.body;
  const kesAmount = parseKesAmount(amount, MPESA_MIN_AMOUNT);

  if (!phoneNumber || kesAmount === null) {
    return res.status(400).json({
      msg: `Missing or invalid fields: phoneNumber and amount (min ${MPESA_MIN_AMOUNT} KES) are required`,
      status: false,
    });
  }

  if (isProduction && (!mpesaConfig.consumer_key || !mpesaConfig.consumer_secret || !mpesaConfig.passKey)) {
    return res.status(500).json({
      msg: "Production credentials not configured. Please set MPESA_PRODUCTION_CONSUMER_KEY, MPESA_PRODUCTION_CONSUMER_SECRET, and MPESA_PRODUCTION_PASSKEY in .env file",
      status: false,
    });
  }

  const businessShortCode = mpesaConfig.businessShortCode;
  const passKey = mpesaConfig.passKey;

  try {
    const accessToken = await getMpesaAccessToken();
    const url = `${mpesaBaseUrl}/mpesa/stkpush/v1/processrequest`;
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = new Buffer.from(businessShortCode + passKey + timestamp).toString("base64");
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const response = await axios.post(
      url,
      {
        BusinessShortCode: businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: kesAmount,
        PartyA: normalizedPhone,
        PartyB: businessShortCode,
        PhoneNumber: normalizedPhone,
        CallBackURL: getCallbackUrl(),
        AccountReference: "SamiaFuture",
        TransactionDesc: "Samia Donate",
      },
      {
        headers: {
          Authorization: "Bearer " + accessToken,
        },
      }
    );

    const checkoutRequestID = response.data?.CheckoutRequestID;
    const merchantRequestID = response.data?.MerchantRequestID;

    return res.status(200).json({
      msg: "Request is successful done ✔✔. Please enter mpesa pin to complete the transaction",
      status: true,
      checkoutRequestID,
      merchantRequestID,
    });
  } catch (error) {
    const errorMessage =
      error.response?.data?.errorMessage ||
      error.response?.data?.error_description ||
      error.message ||
      "Request failed";
    console.log('Samia STK Push Error:', errorMessage);
    return res.status(error.response?.status || 500).json({
      msg: errorMessage,
      status: false,
      error: error.response?.data || error.message,
    });
  }
};

export const stkpushCallback = async (req, res) => {
  try {
    console.log('Samia STK Push Callback Received:', JSON.stringify(req.body, null, 2));

    const callbackData = req.body.Body?.stkCallback;

    if (!callbackData) {
      console.error('Invalid samia callback structure:', req.body);
      return res.status(400).json({
        ResultCode: 1,
        ResultDesc: "Invalid callback structure",
      });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = callbackData;

    const metadata = CallbackMetadata?.Item || [];
    const amount = getMetadataValue('Amount', metadata);
    const mpesaReceiptNumber = getMetadataValue('MpesaReceiptNumber', metadata);
    const phoneNumber = getMetadataValue('PhoneNumber', metadata);
    const succeeded = ResultCode === 0;

    try {
      await prisma.samiaDonation.create({
        data: {
          method: 'mpesa',
          amount: amount ? parseFloat(amount) : 0,
          currency: 'KES',
          status: succeeded ? 'success' : 'failed',
          phoneNumber: String(phoneNumber || ''),
          merchantRequestID: MerchantRequestID,
          checkoutRequestID: CheckoutRequestID,
          mpesaReceiptNumber: succeeded ? (mpesaReceiptNumber || null) : null,
          resultCode: ResultCode,
          resultDesc: ResultDesc,
        },
      });
    } catch (dbError) {
      console.error('Error storing samia donation:', dbError);
    }

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Callback processed successfully",
    });
  } catch (error) {
    console.error('Error processing Samia STK Push callback:', error);
    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Callback received",
    });
  }
};

export const checkPaymentStatus = async (req, res) => {
  try {
    const { checkoutRequestID } = req.params;

    if (!checkoutRequestID) {
      return res.status(400).json({
        status: false,
        msg: "CheckoutRequestID is required",
      });
    }

    const donation = await prisma.samiaDonation.findFirst({
      where: {
        checkoutRequestID,
        method: 'mpesa',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!donation) {
      return res.status(200).json({
        status: 'pending',
        msg: "Payment is being processed. Please wait...",
        payment: null,
      });
    }

    return res.status(200).json({
      status: donation.status,
      msg:
        donation.status === 'success'
          ? `Payment successful! Receipt: ${donation.mpesaReceiptNumber}`
          : `Payment failed: ${donation.resultDesc}`,
      payment: {
        id: donation.id,
        amount: donation.amount,
        phoneNumber: donation.phoneNumber,
        status: donation.status,
        mpesaReceiptNumber: donation.mpesaReceiptNumber,
        resultDesc: donation.resultDesc,
        createdAt: donation.createdAt,
      },
    });
  } catch (error) {
    console.error('Error checking samia payment status:', error);
    return res.status(500).json({
      status: false,
      msg: "Error checking payment status",
      error: error.message,
    });
  }
};

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
          source: 'samia-future',
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
    console.error('Error initializing Samia Paystack:', error.response?.data || error);
    return res.status(error.response?.status || 500).json({
      status: false,
      msg: error.response?.data?.message || error.message || 'Failed to start card payment',
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
    const succeeded = verified?.status === 'success';
    const amountKes =
      typeof verified?.amount === 'number' ? verified.amount / 100 : undefined;

    if (verified?.reference) {
      await upsertPaystackDonation({
        reference: verified.reference,
        amountKes,
        status: succeeded ? 'success' : 'failed',
        resultDesc: verified.status,
      });
    }

    return res.status(200).json({
      status: succeeded ? 'success' : verified?.status || 'failed',
      msg: succeeded ? 'Payment successful' : 'Payment not completed',
      reference: verified?.reference || reference,
    });
  } catch (error) {
    console.error('Error verifying Samia Paystack:', error.response?.data || error);
    return res.status(error.response?.status || 500).json({
      status: false,
      msg: error.response?.data?.message || error.message || 'Failed to verify payment',
    });
  }
};
