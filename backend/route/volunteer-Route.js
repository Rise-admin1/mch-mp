import express from 'express';
const volunteerRouter = express.Router();
import {
    volunteerSubmitForm,
    volunteerGetPdf,
    expoRegister,
    expoPhoneStatus,
    checkVolunteerFirebasePhone,
    getAllVolunteers,
    getAllExpoRegistrations,
    deleteVolunteerById,
    deleteExpoRegistrationById,
} from '../controller/volunteer-controller.js';

volunteerRouter.post('/check-firebase-phone', checkVolunteerFirebasePhone);
volunteerRouter.post('/submit', volunteerSubmitForm);
volunteerRouter.get('/all', getAllVolunteers);
volunteerRouter.get('/expo-register/all', getAllExpoRegistrations);
volunteerRouter.post('/expo-register', expoRegister);
volunteerRouter.post('/expo-phone-status', expoPhoneStatus);
volunteerRouter.post('/pdf', volunteerGetPdf);
volunteerRouter.delete('/entry/:id', deleteVolunteerById);
volunteerRouter.delete('/expo-register/:id', deleteExpoRegistrationById);

export default volunteerRouter;