
import nodemailer from 'nodemailer';

export const createTransport = (user, pass) => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass,
    },
  });
};
