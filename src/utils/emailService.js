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

  const text = await res.text();

  if (!res.ok) {
    console.error('Brevo sendEmail error:', res.status, text);
    throw new Error(`Brevo sendEmail failed: ${res.status}`);
  }
  return JSON.parse(text);
}

function sanitizeName(userName) {
  let name = typeof userName === 'string' && userName.trim() ? userName : 'User';
  name = name.replace(/[^a-zA-Z0-9\s'-]/g, '').trim();
  return name || 'User';
}

export async function sendVerificationEmail(userName, toEmail, verificationUrl) {

  const safeName = sanitizeName(userName);
  const firstName = safeName.split(' ')[0];
  const year = new Date().getFullYear();
  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_VERIFICATION_TEMPLATE_ID),
    params: { firstName, verificationLink: verificationUrl, year }
  };
  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

export async function sendResetPasswordEmail(userName, toEmail, resetUrl) {

  const safeName = sanitizeName(userName);
  const firstName = safeName.split(' ')[0];
  const year = new Date().getFullYear();
  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_RESET_PASSWORD_TEMPLATE_ID),
    params: { firstName, resetLink: resetUrl, year }
  };
  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

export async function sendLandlordPromotion(userName, toEmail) {

  const safeName = sanitizeName(userName);
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

export async function sendBookingConfirmation({ userName, toEmail, propertyTitle, propertyCity, startDate, endDate, rentPerMonth, bookingLink }) {

  const safeName = sanitizeName(userName);
  const firstName = safeName.split(' ')[0];
  const year = new Date().getFullYear();

  const start = new Date(startDate);
  const end = new Date(endDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const numDays = Math.round((end - start) / msPerDay) + 1;
  const dailyRate = rentPerMonth / 30;
  const totalAmount = (dailyRate * numDays).toFixed(2);
  const amountDisplay = `${totalAmount} (for ${numDays} days)`;

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_BOOKING_CONFIRMATION_TEMPLATE_ID),
    params: { firstName, propertyTitle, propertyCity, startDate, endDate, amount: amountDisplay, bookingLink, year }
  };
  console.log('Booking confirmation payload:', JSON.stringify(payload, null, 2));
  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

export async function sendBookingRejection({ userName, toEmail, propertyTitle, startDate, endDate, listingsLink }) {
  const safeName = sanitizeName(userName);
  const firstName = safeName.split(' ')[0];
  const year = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_BOOKING_REJECT_TEMPLATE_ID),
    params: { firstName, propertyTitle, startDate, endDate, listingsLink, year }
  };
  console.log('Booking rejection payload:', JSON.stringify(payload, null, 2));
  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

export async function sendBookingCancellation({
  userName, toEmail,
  propertyTitle, propertyCity,
  startDate, endDate, supportLink
}) {
  const safeName = sanitizeName(userName);
  const firstName = safeName.split(' ')[0];
  const year = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_BOOKING_CANCELLATION_TEMPLATE_ID),
    params: { firstName, propertyTitle, propertyCity, startDate, endDate, supportLink, year }
  };

  console.log('Booking cancellation payload:', JSON.stringify(payload, null, 2));
  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

// Send Payment Success Email
export async function sendPaymentSuccess({
  userName,
  toEmail,
  propertyTitle,
  amount,
  paidAt,
  bookingLink
}) {
  const safeName = sanitizeName(userName);
  const firstName = safeName.split(' ')[0];
  const year = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_PAYMENT_SUCCESS_TEMPLATE_ID),
    params: { firstName, propertyTitle, amount, paidAt, bookingLink, year }
  };

  console.log('Payment success payload:', JSON.stringify(payload, null, 2));
  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

// Send Payment Failure Email
export async function sendPaymentFailure({
  userName,
  toEmail,
  propertyTitle,
  amount,
  supportLink
}) {
  const safeName = sanitizeName(userName);
  const firstName = safeName.split(' ')[0];
  const year = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_PAYMENT_FAILURE_TEMPLATE_ID),
    params: { firstName, propertyTitle, amount, supportLink, year }
  };

  console.log('Payment failure payload:', JSON.stringify(payload, null, 2));
  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}


