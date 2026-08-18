import { PrismaClient } from '@prisma/client'
import axios from "axios";
import moment from "moment";
import {
  normalizePhoneNumber,
  isProduction,
  mpesaBaseUrl as baseUrl,
  mpesaConfig as config,
  getBackendUrl,
  getMpesaAccessToken,
} from "../utils/mpesaDaraja.js";
const prisma = new PrismaClient();

const getCallbackUrl = () => {
  const backendUrl = getBackendUrl();
  console.log(backendUrl, 'backendUrl');
  return `${backendUrl}/api/dajaria/callback`;
};

async function getAccessToken() {
  console.log(config, 'config');
  console.log(baseUrl, 'baseUrl');
  return getMpesaAccessToken();
}

export const stkpush = async(req,res)=>{
    const {accountNumber, phoneNumber, amount} = req.body;
    
    // Validate required fields
    if (!phoneNumber || !amount) {
      return res.status(400).json({
        msg: "Missing required fields: phoneNumber and amount are required",
        status: false,
      });
    }

    // Validate production credentials if in production mode
    if (isProduction && (!config.consumer_key || !config.consumer_secret || !config.passKey)) {
      return res.status(500).json({
        msg: "Production credentials not configured. Please set MPESA_PRODUCTION_CONSUMER_KEY, MPESA_PRODUCTION_CONSUMER_SECRET, and MPESA_PRODUCTION_PASSKEY in .env file",
        status: false,
      });
    }

    const businessShortCode = config.businessShortCode;
    const passKey = config.passKey;
    
    getAccessToken()
    .then((accessToken) => {
      const url = `${baseUrl}/mpesa/stkpush/v1/processrequest`;
      const auth = "Bearer " + accessToken;
      const timestamp = moment().format("YYYYMMDDHHmmss");
      const password = new Buffer.from(
        businessShortCode +
        passKey +
        timestamp
      ).toString("base64");

      console.log(password);
      

      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      
      axios
        .post(
          url,
          {
            BusinessShortCode: businessShortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: normalizedPhone,
            PartyB: businessShortCode,
            PhoneNumber: normalizedPhone,
            CallBackURL: getCallbackUrl(),
            AccountReference: "Mugenya 2027",
            TransactionDesc: "Contribution to Michael Mugenya 2027",
          },
          {
            headers: {
              Authorization: auth,
            },
          }
        )
        .then((response) => {
          // res.send("😀 Request is successful done ✔✔. Please enter mpesa pin to complete the transaction");
          //SEND BACK A JSON RESPONSE TO THE CLIENT
          console.log(response.data);
          
          const checkoutRequestID = response.data?.CheckoutRequestID;
          const merchantRequestID = response.data?.MerchantRequestID;
          
          res.status(200).json({
            msg: "Request is successful done ✔✔. Please enter mpesa pin to complete the transaction",
            status: true,
            checkoutRequestID: checkoutRequestID,
            merchantRequestID: merchantRequestID,
          });

        })
        .catch((error) => {
          console.log(error,'final');
          const errorMessage = error.response?.data?.errorMessage || error.response?.data?.error_description || error.message || "Request failed";
          console.log('STK Push Error:', errorMessage);
          res.status(error.response?.status || 500).json({
            msg: errorMessage,
            status: false,
            error: error.response?.data || error.message,
          });
        });
    })
    .catch((error) => {
      console.log('Access Token Error:', error);
      const errorMessage = error.response?.data?.error_description || error.message || "Failed to get access token";
      res.status(error.response?.status || 500).json({
        msg: errorMessage,
        status: false,
        error: error.response?.data || error.message,
      });
    });
}

// STK Push Callback Handler - Receives payment confirmation from Safaricom
export const stkpushCallback = async (req, res) => {
  try {
    console.log('STK Push Callback Received:', JSON.stringify(req.body, null, 2));

    // Safaricom sends the callback in this structure
    const callbackData = req.body.Body?.stkCallback;

    if (!callbackData) {
      console.error('Invalid callback structure:', req.body);
      return res.status(400).json({
        ResultCode: 1,
        ResultDesc: "Invalid callback structure"
      });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata
    } = callbackData;

    // Helper function to find value by name in metadata array
    const getMetadataValue = (name, metadataArray) => {
      if (!metadataArray) return null;
      const item = metadataArray.find(item => item.Name === name);
      return item?.Value || null;
    };

    // ResultCode 0 = Success, any other number = Failure
    if (ResultCode === 0) {
      // Payment successful - extract transaction details
      const metadata = CallbackMetadata?.Item || [];
      
      const amount = getMetadataValue('Amount', metadata);
      const mpesaReceiptNumber = getMetadataValue('MpesaReceiptNumber', metadata);
      const transactionDateValue = getMetadataValue('TransactionDate', metadata);
      const phoneNumber = getMetadataValue('PhoneNumber', metadata);
      const accountReference = getMetadataValue('AccountReference', metadata);

      // Convert transaction date from YYYYMMDDHHmmss format to Date
      let transactionDate = null;
      if (transactionDateValue) {
        const dateStr = String(transactionDateValue);
        // Format: YYYYMMDDHHmmss -> Date object
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = dateStr.substring(8, 10);
        const minute = dateStr.substring(10, 12);
        const second = dateStr.substring(12, 14);
        transactionDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
      }

      console.log('Payment Successful:', {
        MerchantRequestID,
        CheckoutRequestID,
        Amount: amount,
        ReceiptNumber: mpesaReceiptNumber,
        TransactionDate: transactionDate,
        PhoneNumber: phoneNumber,
        AccountReference: accountReference
      });

      // Store successful payment in database
      try {
        await prisma.payment.create({
          data: {
            merchantRequestID: MerchantRequestID,
            checkoutRequestID: CheckoutRequestID,
            phoneNumber: String(phoneNumber || ''),
            amount: amount ? parseFloat(amount) : 0,
            mpesaReceiptNumber: mpesaReceiptNumber || null,
            accountReference: accountReference || null,
            transactionDate: transactionDate,
            status: 'success',
            resultCode: ResultCode,
            resultDesc: ResultDesc,
            errorMessage: null
          }
        });
        console.log('Payment record created successfully');
      } catch (dbError) {
        console.error('Error storing payment in database:', dbError);
        // Continue execution even if DB save fails
      }

      // Return success response to Safaricom
      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Callback processed successfully"
      });

    } else {
      // Payment failed - extract available data
      const metadata = CallbackMetadata?.Item || [];
      const amount = getMetadataValue('Amount', metadata);
      const phoneNumber = getMetadataValue('PhoneNumber', metadata);
      const accountReference = getMetadataValue('AccountReference', metadata);

      console.log('Payment Failed:', {
        MerchantRequestID,
        CheckoutRequestID,
        ResultCode,
        ResultDesc,
        Amount: amount,
        PhoneNumber: phoneNumber
      });

      // Store failed payment attempt in database
      try {
        await prisma.payment.create({
          data: {
            merchantRequestID: MerchantRequestID,
            checkoutRequestID: CheckoutRequestID,
            phoneNumber: String(phoneNumber || ''),
            amount: amount ? parseFloat(amount) : 0,
            mpesaReceiptNumber: null,
            accountReference: accountReference || null,
            transactionDate: null,
            status: 'failed',
            resultCode: ResultCode,
            resultDesc: ResultDesc,
            errorMessage: ResultDesc
          }
        });
        console.log('Failed payment record created successfully');
      } catch (dbError) {
        console.error('Error storing failed payment in database:', dbError);
        // Continue execution even if DB save fails
      }

      // Return success response to Safaricom (we acknowledge receipt)
      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Callback received and processed"
      });
    }

  } catch (error) {
    console.error('Error processing STK Push callback:', error);
    
    // Still return success to Safaricom to acknowledge receipt
    // (You can retry processing later if needed)
    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Callback received"
    });
  }
}

// Check payment status by CheckoutRequestID
export const checkPaymentStatus = async (req, res) => {
  try {
    const { checkoutRequestID } = req.params;

    if (!checkoutRequestID) {
      return res.status(400).json({
        status: false,
        msg: "CheckoutRequestID is required"
      });
    }

    // Find payment in database
    const payment = await prisma.payment.findFirst({
      where: {
        checkoutRequestID: checkoutRequestID
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!payment) {
      // Payment not yet processed (callback not received)
      return res.status(200).json({
        status: 'pending',
        msg: "Payment is being processed. Please wait...",
        payment: null
      });
    }

    // Payment found - return status
    return res.status(200).json({
      status: payment.status, // 'success' or 'failed'
      msg: payment.status === 'success' 
        ? `Payment successful! Receipt: ${payment.mpesaReceiptNumber}` 
        : `Payment failed: ${payment.resultDesc}`,
      payment: {
        id: payment.id,
        amount: payment.amount,
        phoneNumber: payment.phoneNumber,
        status: payment.status,
        mpesaReceiptNumber: payment.mpesaReceiptNumber,
        resultDesc: payment.resultDesc,
        errorMessage: payment.errorMessage,
        transactionDate: payment.transactionDate,
        createdAt: payment.createdAt
      }
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    return res.status(500).json({
      status: false,
      msg: "Error checking payment status",
      error: error.message
    });
  }
}