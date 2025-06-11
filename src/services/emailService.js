

import { Resend } from 'resend';


/**
 * Send an account verification email to the user.
 * @param {string} to - Recipient email address
 * @param {string} token - Verification token
 */
const resend = new Resend(process.env.RESEND_API_KEY);


export async function sendVerificationEmail(to, token) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${token}`;
  await resend.emails.send({
    from: `Rentify <${process.env.EMAIL_FROM}>`,
    to,
    subject: 'Verify your Rentify account',
    html: `
      <p>Hello,</p>
      <p>Thank you for registering on Rentify. Please verify your email address by clicking the link below:</p>
      <p><a href="${verifyUrl}">Verify my account</a></p>
      <p>If you did not register, please ignore this email.</p>
    `,
  });
}
