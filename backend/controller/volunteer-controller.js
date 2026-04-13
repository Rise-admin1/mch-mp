import { PrismaClient } from '@prisma/client'
import { validateVolunteerPollingSelection } from '../utils/volunteerPollingCatalog.js'
import { normalizeKePhone, ensureVolunteerCanSubmitPhone, getFirebaseAdminAuth } from '../utils/firebaseAdmin.js'

const prisma = new PrismaClient();

export const checkVolunteerFirebasePhone = async (req, res) => {
    try {
        const phone = req.body?.phone
        if (!phone || typeof phone !== 'string') {
            return res.status(400).json({ message: 'phone is required' })
        }
        const normalized = normalizeKePhone(phone)
        if (!normalized) {
            return res.status(400).json({ message: 'Invalid phone number' })
        }
        const auth = getFirebaseAdminAuth()
        if (!auth) {
            return res.status(200).json({ exists: false, checkUnavailable: true })
        }
        try {
            await auth.getUserByPhoneNumber(normalized)
            return res.status(200).json({ exists: true })
        } catch (e) {
            if (e?.code === 'auth/user-not-found') {
                return res.status(200).json({ exists: false })
            }
            throw e
        }
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

export const volunteerSubmitForm = async (req, res, next) => {
    try {
        const {
            fullName,
            ward,
            location,
            subLocation,
            pollingStation,
            phone,
            privacyPolicy,
            firebaseIdToken,
        } = req.body;

        // const geoCheck = validateVolunteerPollingSelection(ward, location, subLocation, pollingStation)
        // if (!geoCheck.ok) {
        //     return res.status(400).json({ message: geoCheck.message })
        // }

        const normalizedPhone = normalizeKePhone(phone)
        if (!normalizedPhone) {
            return res.status(400).json({ message: 'Invalid phone number' })
        }

        const phoneGate = await ensureVolunteerCanSubmitPhone(normalizedPhone, firebaseIdToken)
        if (!phoneGate.ok) {
            return res.status(phoneGate.status).json({ message: phoneGate.message })
        }

        const newVolunteer = await prisma.userVolunteer.create({
            data: {
                fullName: typeof fullName === 'string' ? fullName.trim() : '',
                ward: typeof ward === 'string' ? ward.trim() : '',
                location: typeof location === 'string' ? location.trim() : '',
                subLocation: typeof subLocation === 'string' ? subLocation.trim() : '',
                pollingStation: typeof pollingStation === 'string' ? pollingStation.trim() : '',
                phone: normalizedPhone,
                message: '',
                privacyPolicy: Boolean(privacyPolicy),
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

export const getAllVolunteers = async (req, res, next) => {
    try {
        const rawOffset = req.query?.offset
        const rawLimit = req.query?.limit

        const parsedOffset = Number.parseInt(String(rawOffset ?? '0'), 10)
        const parsedLimit = Number.parseInt(String(rawLimit ?? '20'), 10)

        const offset = Number.isNaN(parsedOffset) ? 0 : Math.max(0, parsedOffset)
        const limitCandidate = Number.isNaN(parsedLimit) ? 20 : parsedLimit
        const limit = Math.min(100, limitCandidate <= 0 ? 20 : limitCandidate)

        const totalCount = await prisma.userVolunteer.count()

        const volunteers = await prisma.userVolunteer.findMany({
            skip: offset,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                fullName: true,
                ward: true,
                location: true,
                subLocation: true,
                pollingStation: true,
                phone: true,
                createdAt: true,
                updatedAt: true,
            }
        })

        res.status(200).json({
            data: volunteers,
            pagination: {
                offset,
                limit,
                totalCount,
            }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}
