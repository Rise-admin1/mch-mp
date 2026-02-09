import dotenv from 'dotenv';
dotenv.config();
export const frontendURL = process.env.FRONTEND_URL ||
  [
    'http://localhost:5173',
    'https://www.funyula.com',
    'https://funyula.com',
  ];

export const corsOptions = {
    origin :  (origin, callback) => { 
        console.log(origin,'origin-------------------------------');
        
        if(frontendURL.indexOf(origin) !== -1 || !origin){
            callback(null, true)
        }else{
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true,
    optionSuccessStatus: 200
}

export const stripeFrontendURL = process.env.STRIPE_FRONTEND_URL || 'http://localhost:5173';