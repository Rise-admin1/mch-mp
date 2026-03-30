import express from 'express';
const volunteerRouter = express.Router();
import { volunteerSubmitForm, volunteerGetPdf, expoRegister, expoPhoneStatus, checkVolunteerFirebasePhone } from '../controller/volunteer-controller.js';

volunteerRouter.post('/check-firebase-phone', checkVolunteerFirebasePhone);
volunteerRouter.post('/submit', volunteerSubmitForm);
volunteerRouter.post('/expo-register', expoRegister);
volunteerRouter.post('/expo-phone-status', expoPhoneStatus);
volunteerRouter.post('/pdf', volunteerGetPdf);

export default volunteerRouter;