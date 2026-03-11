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

export const expoRegister = async (req, res, next) => {
    try {
        const { groupName, designation, groupLeaderName, yourName, idNumber, phoneNumber, isVerified } = req.body;
        await prisma.expoRegistration.create({
            data: {
                groupName,
                designation,
                groupLeaderName,
                yourName,
                idNumber,
                phoneNumber,
                isVerified: Boolean(isVerified),
            }
        });
        res.status(200).json({ message: 'Registration successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const expoPhoneStatus = async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ message: 'phoneNumber is required' });
        }

        const [user, expoVerified] = await Promise.all([
            prisma.user.findUnique({
                where: { phone: phoneNumber }
            }),
            prisma.expoRegistration.findFirst({
                where: { phoneNumber, isVerified: true },
                select: { id: true }
            })
        ]);

        const isVerified = Boolean(user?.isVerified) || Boolean(expoVerified);
        const exists = Boolean(user) || Boolean(expoVerified);

        return res.status(200).json({ exists, isVerified });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

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
