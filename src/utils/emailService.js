const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_NAME   = process.env.EMAIL_SENDER_NAME    || 'Rentify';
const SENDER_EMAIL  = process.env.EMAIL_SENDER_ADDRESS || 'kubsamlkm@gmail.com';

if (!BREVO_API_KEY) {
  throw new Error('Missing BREVO_API_KEY in env');
}

async function sendEmail(url, payload) {
  const res = await fetch(url, {
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
    console.error('Brevo sendEmail error:', res.status, errText);
    throw new Error('Failed to send email');
  }
  return res.json();
}

export async function sendVerificationEmail(userName, toEmail, verificationUrl) {
  let safeName = (typeof userName === 'string' && userName.trim().length > 0)
    ? userName
    : 'User';

  safeName = safeName.replace(/[^a-zA-Z0-9\s'-]/g, '');
  if (safeName.trim().length === 0) {
    safeName = 'User';
  }

  const firstName = safeName.split(' ')[0];
  const year = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_VERIFICATION_TEMPLATE_ID), 
    params: {
      firstName,
      verificationLink: verificationUrl,
      year
    }
  };

  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}


export async function sendResetPasswordEmail(userName, toEmail, resetUrl) {
  let safeName = (typeof userName === 'string' && userName.trim().length > 0)
    ? userName
    : 'User';

  safeName = safeName.replace(/[^a-zA-Z0-9\s'-]/g, '');
  if (safeName.trim().length === 0) {
    safeName = 'User';
  }

  const firstName = safeName.split(' ')[0];
  const year = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_RESET_PASSWORD_TEMPLATE_ID),
    params: {
      firstName,
      resetLink: resetUrl,
      year
    }
  };

  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

export async function sendLandlordPromotion(userName, toEmail) {
  let safeName = (typeof userName === 'string' && userName.trim().length > 0)
    ? userName
    : 'User';

  safeName = safeName.replace(/[^a-zA-Z0-9\s'-]/g, '');
  if (safeName.trim().length === 0) {
    safeName = 'User';
  }

  const firstName = safeName.split(' ')[0];
  const year = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_LANDLORD_PROMO_TEMPLATE_ID),
    params: {
      firstName,
      dashboardLink: `${process.env.FRONTEND_URL}/properties/list`,
      listingGuideLink: `${process.env.FRONTEND_URL}/help/how-to-list`,
      supportLink: `${process.env.FRONTEND_URL}/help`,
      year,
      recipientEmail: toEmail
    }
  };

  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

