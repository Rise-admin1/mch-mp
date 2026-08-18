import dotenv from 'dotenv';
dotenv.config();
const samiaOrigins = [
  'http://localhost:3000',
  'http://localhost:3002',
  'https://samiafuture.com',
  'https://www.samiafuture.com',
];

export const frontendURL = process.env.FRONTEND_URL ||
  [
    'http://localhost:3000',
    'https://www.funyula.com',
    'https://funyula.com',
    'http://localhost:5173',
    'https://www.scheduling.phdsuccess.ae',
    ...samiaOrigins,
  ];

export const corsOptions = {
    origin :  (origin, callback) => { 
        console.log(origin,'origin-------------------------------');
        
        if(frontendURL.indexOf(origin) !== -1 || samiaOrigins.indexOf(origin) !== -1 || !origin){
            callback(null, true)
        }else{
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true,
    optionSuccessStatus: 200
}

export const stripeFrontendURL = process.env.STRIPE_FRONTEND_URL || 'http://localhost:3000';