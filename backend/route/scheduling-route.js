import express from "express";
const schedulingRouter = express.Router();
import { getAvailability, createCheckout } from "../controller/scheduling-controller.js";

schedulingRouter.get("/get-availability", getAvailability);

schedulingRouter.post("/checkout", createCheckout);



export default schedulingRouter;