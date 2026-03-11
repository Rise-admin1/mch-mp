import express from 'express';
const volunteerRouter = express.Router();
import { volunteerSubmitForm, volunteerGetPdf, expoRegister } from '../controller/volunteer-controller.js';

volunteerRouter.post('/submit', volunteerSubmitForm);
volunteerRouter.post('/expo-register', expoRegister);
volunteerRouter.post('/pdf', volunteerGetPdf);

export default volunteerRouter;