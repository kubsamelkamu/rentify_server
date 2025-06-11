const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_NAME   = process.env.EMAIL_SENDER_NAME    || 'Rentify';
const SENDER_EMAIL  = process.env.EMAIL_SENDER_ADDRESS || 'kubsamlkm@gmail.com';

if (!BREVO_API_KEY) {
  throw new Error('Missing BREVO_API_KEY in env');
}

const baseStyles = {
  body: `
    margin: 0;
    padding: 20px;
    font-family: Arial, sans-serif;
    background-color: #f4f4f7;
    color: #51545e;
  `,
  container: `
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  `,
  header: `
    background-color: #5c6ac4;
    color: #ffffff;
    padding: 20px;
    text-align: center;
  `,
  content: 'padding: 30px;',
  button: `
    display: inline-block;
    padding: 12px 24px;
    background-color: #5c6ac4;
    color: #ffffff !important;
    border-radius: 4px;
    text-decoration: none;
    font-size: 16px;
  `,
  footer: `
    padding: 20px;
    font-size: 12px;
    color: #a8aaaf;
    text-align: center;
  `
};

export async function sendVerificationEmail(userName, toEmail, verificationUrl) {
  const html = `
  <html>
    <body style="${baseStyles.body}">
      <table width="100%" style="${baseStyles.container}">
        <tr>
          <td style="${baseStyles.header}">
            <h1>Welcome to Rentify</h1>
          </td>
        </tr>
        <tr>
          <td style="${baseStyles.content}">
            <p>Hi ${userName},</p>
            <p>Thanks for joining Rentify! Please verify your email address by clicking the button below:</p>
            <p style="text-align:center;">
              <a href="${verificationUrl}" style="${baseStyles.button}">Verify Email</a>
            </p>
            <p>If the button doesn’t work, copy and paste this link into your browser:</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p>If you didn’t sign up for a Rentify account, you can safely ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="${baseStyles.footer}">
            © ${new Date().getFullYear()} Rentify. All rights reserved.
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail }],
    subject: 'Verify Your Rentify Email',
    htmlContent: html
  };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Brevo sendVerificationEmail error:', res.status, errText);
    throw new Error('Failed to send verification email');
  }

  return res.json();
}

export async function sendResetPasswordEmail(userName, toEmail, resetUrl) {
  const html = `
  <html>
    <body style="${baseStyles.body}">
      <table width="100%" style="${baseStyles.container}">
        <tr>
          <td style="${baseStyles.header}">
            <h1>Password Reset</h1>
          </td>
        </tr>
        <tr>
          <td style="${baseStyles.content}">
            <p>Hi ${userName},</p>
            <p>We received a request to reset your Rentify password. Click the button below to proceed:</p>
            <p style="text-align:center;">
              <a href="${resetUrl}" style="${baseStyles.button}">Reset Password</a>
            </p>
            <p>If that button doesn’t work, copy and paste this link into your browser:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>This link will expire in one hour. If you didn’t request a password reset, please ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="${baseStyles.footer}">
            © ${new Date().getFullYear()} Rentify. Need help? Reply to this email.
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail }],
    subject: 'Reset Your Rentify Password',
    htmlContent: html
  };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Brevo sendResetPasswordEmail error:', res.status, errText);
    throw new Error('Failed to send reset password email');
  }

  return res.json();
}
