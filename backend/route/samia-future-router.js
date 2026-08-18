import express from "express";
import {
  stkpush,
  stkpushCallback,
  checkPaymentStatus,
  initializePaystack,
  chargePaystackMpesa,
  verifyPaystack,
} from "../controller/samia-future-controller.js";

const samiaFutureRouter = express.Router();

samiaFutureRouter.post('/stkpush', stkpush);
samiaFutureRouter.post('/callback', stkpushCallback);
samiaFutureRouter.get('/status/:checkoutRequestID', checkPaymentStatus);
samiaFutureRouter.post('/paystack/initialize', initializePaystack);
samiaFutureRouter.post('/paystack/mpesa', chargePaystackMpesa);
samiaFutureRouter.get('/paystack/verify/:reference', verifyPaystack);

export default samiaFutureRouter;
