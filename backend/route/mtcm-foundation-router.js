import express from "express";
import {
  initializePaystack,
  chargePaystackMpesa,
  verifyPaystack,
} from "../controller/mtcm-foundation-controller.js";

const mtcmFoundationRouter = express.Router();

mtcmFoundationRouter.post('/paystack/initialize', initializePaystack);
mtcmFoundationRouter.post('/paystack/mpesa', chargePaystackMpesa);
mtcmFoundationRouter.get('/paystack/verify/:reference', verifyPaystack);

export default mtcmFoundationRouter;
