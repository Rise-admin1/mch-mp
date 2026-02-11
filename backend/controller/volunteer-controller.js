import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient();

export const volunteerSubmitForm = async (req, res, next) => {
    try {
        const { firstName, lastName, email, phone, location, subLocation, message, privacyPolicy } = req.body;
        const newVolunteer = await prisma.userVolunteer.create({
            data: {
                firstName,
                lastName,
                email,
                phone,
                location,
                subLocation,
                message,
                privacyPolicy
            }
        });

        res.status(200).json({ message: 'Volunteer form submitted successfully' });
    } catch (error) {
        console.log(error);

        res.status(500).json({ message: 'Internal server error' });
    }
}

export const volunteerGetPdf = async (req, res, next) => {
    const { fullName, location, subLocation, phoneNumber, verificationCode } = req.body;

    try {
        // Check if the user already exists
        const checkVolunteer = await prisma.user.findUnique({
            where: {
                phone: phoneNumber
            }
        });
        if (checkVolunteer) {

            return res.status(200).json({ message: 'You have already verified.',pdf:true });
        }
        // Create a new volunteer
        const volunteer = await prisma.user.create({
            data: {
                fullName,
                location,
                subLocation,
                phone: phoneNumber,
                verificationCode,
                isVerified: true,
            }
        });

        // Redirect to the platform
        return res.status(200).json({ message: 'You have already verified.',pdf:true });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error',pdf:false });
    }
};
