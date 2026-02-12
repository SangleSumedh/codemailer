
import nodemailer from 'nodemailer';

export const createTransport = (user: string, pass: string) => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass,
    },
  });
};
