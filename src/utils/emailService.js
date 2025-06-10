import SibApiV3Sdk from 'sib-api-v3-sdk';
import dotenv from 'dotenv';
dotenv.config();


const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

export const sendVerificationEmail = async (toEmail, verificationUrl) => {
  const senderEmail = process.env.EMAIL_FROM;

  if (!senderEmail) {
    console.error('Missing EMAIL_FROM env variable');
    throw new Error('EMAIL_FROM env variable is not set');
  }

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail({
    sender: { email: senderEmail, name: 'Rentify' },
    to: [{ email: toEmail }],
    subject: 'Verify your Rentify account',
    htmlContent: `
      <p>Hello,</p>
      <p>Thank you for registering on Rentify. Please verify your email address by clicking the link below:</p>
      <p><a href="${verificationUrl}">Verify my account</a></p>
      <p>If you did not register, please ignore this email.</p>
    `,
  });

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    return response;
  } catch (error) {
    console.error('Error sending email:', error.response?.body || error);
    throw error;
  }
};
