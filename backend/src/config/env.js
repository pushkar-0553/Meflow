import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  SESSION_SECRET: process.env.SESSION_SECRET || 'meflow-dev-session-secret-change-in-prod-1234',

  // Database
  DB: {
    HOST: process.env.DB_HOST || '127.0.0.1',
    PORT: parseInt(process.env.DB_PORT || '4000', 10),
    USER: process.env.DB_USER || 'root',
    PASSWORD: process.env.DB_PASSWORD || '',
    NAME: process.env.DB_NAME || 'meflow',
    SSL: process.env.DB_SSL === 'true',
  },

  // Email (Resend HTTPS)
  EMAIL: {
    API_KEY: process.env.RESEND_API_KEY || '',
    FROM: process.env.EMAIL_FROM || 'VCube MeFlow <notifications@resend.dev>',
  },

  // Storage (Cloudinary)
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    API_KEY: process.env.CLOUDINARY_API_KEY || '',
    API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  },

  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
};

