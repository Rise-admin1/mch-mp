import axios from "axios";

export function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return phoneNumber;
  return String(phoneNumber).replace(/^\+/, '');
}

export const isProduction =
  process.env.NODE_ENV === 'production' || process.env.MPESA_ENV === 'production';

export const mpesaBaseUrl = isProduction
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";

const SANDBOX_CONFIG = {
  consumer_key: process.env.MPESA_CONSUMER_KEY || "",
  consumer_secret: process.env.MPESA_CONSUMER_SECRET || "",
  businessShortCode: process.env.MPESA_SHORTCODE || "",
  passKey: process.env.MPESA_PASSKEY || "",
};

const PRODUCTION_CONFIG = {
  consumer_key: process.env.MPESA_PRODUCTION_CONSUMER_KEY || "",
  consumer_secret: process.env.MPESA_PRODUCTION_CONSUMER_SECRET || "",
  businessShortCode: process.env.MPESA_PRODUCTION_SHORTCODE || "4006467",
  passKey: process.env.MPESA_PRODUCTION_PASSKEY || "",
};

export const mpesaConfig = isProduction ? PRODUCTION_CONFIG : SANDBOX_CONFIG;

export function getBackendUrl() {
  return process.env.BACKEND_URL || process.env.SERVER_URL || 'http://localhost:3001';
}

export async function getMpesaAccessToken() {
  const url = `${mpesaBaseUrl}/oauth/v1/generate?grant_type=client_credentials`;
  const auth =
    "Basic " +
    new Buffer.from(mpesaConfig.consumer_key + ":" + mpesaConfig.consumer_secret).toString("base64");

  const response = await axios.get(url, {
    headers: {
      Authorization: auth,
    },
  });
  return response.data.access_token;
}
