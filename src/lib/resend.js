import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('Please add your Resend API key to .env.local');
}

export const resend = new Resend(process.env.RESEND_API_KEY);





