import express from "express";
import {
  stkpush,
  stkpushCallback,
  checkPaymentStatus,
  initializePaystack,
  verifyPaystack,
} from "../controller/samia-future-controller.js";

const samiaFutureRouter = express.Router();

samiaFutureRouter.post('/stkpush', stkpush);
samiaFutureRouter.post('/callback', stkpushCallback);
samiaFutureRouter.get('/status/:checkoutRequestID', checkPaymentStatus);
samiaFutureRouter.post('/paystack/initialize', initializePaystack);
samiaFutureRouter.get('/paystack/verify/:reference', verifyPaystack);

export default samiaFutureRouter;
