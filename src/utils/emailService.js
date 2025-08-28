import dotenv from 'dotenv';
dotenv.config();

export const BREVO_API_KEY                = process.env.BREVO_API_KEY;
export const SENDER_NAME                  = process.env.EMAIL_SENDER_NAME    || 'Rentify';
export const SENDER_EMAIL                 = process.env.EMAIL_SENDER_ADDRESS || 'srentify@gmail.com';
export const CONTACT_RECEIVER_EMAIL       = process.env.CONTACT_RECEIVER_EMAIL || 'srentify@gmail.com';
export const BREVO_LIST_ID                = process.env.BREVO_LIST_ID;
export const BREVO_CONTACT_TEMPLATE_ID    = Number(process.env.BREVO_CONTACT_TEMPLATE_ID);
export const BREVO_NEWSLETTER_TEMPLATE_ID = Number(process.env.BREVO_NEWSLETTER_TEMPLATE_ID);

if (!BREVO_API_KEY) {
  throw new Error('Missing BREVO_API_KEY in env');
}

export async function sendEmail(url, payload) {
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

export function sanitizeName(userName) {
  let name = typeof userName === 'string' && userName.trim() ? userName : 'User';
  name = name.replace(/[^a-zA-Z0-9\s'-]/g, '').trim();
  return name || 'User';
}

export async function sendVerificationOtpEmail(userName, toEmail, otp) {
  const safeName = sanitizeName(userName);
  const firstName = safeName.split(' ')[0];
  const year = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_VERIFICATION_OTP_TEMPLATE_ID),
    params: { firstName, otp, year },
  };

  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
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

export async function sendResetPasswordEmail(userName, toEmail, otp) {
  const safeName = sanitizeName(userName);
  const firstName = safeName.split(' ')[0];
  const year = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_RESET_PASSWORD_TEMPLATE_ID), 
    params: { firstName, otp, year },
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



export async function sendBookingRequest(opts) {
  
  const {landlordName,toEmail,propertyTitle,propertyCity,startDate,endDate,tenantName,tenantEmail,bookingLink
  } = opts;

  const safeName  = sanitizeName(landlordName);
  const firstName = safeName.split(' ')[0];
  const year      = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to:     [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_BOOKING_REQUEST_TEMPLATE_ID),
    params: {
      firstName,
      propertyTitle,
      propertyCity,
      startDate,
      endDate,
      tenantName,
      tenantEmail,
      bookingLink,
      year
    }
  };
  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

export async function sendBookingConfirmation(opts) {

  const { userName, toEmail, propertyTitle, propertyCity, startDate, endDate, rentPerMonth, bookingLink } = opts;
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
  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

export async function sendBookingRejection(opts) {

  const { userName, toEmail, propertyTitle, startDate, endDate, listingsLink } = opts;
  const safeName = sanitizeName(userName);
  const firstName = safeName.split(' ')[0];
  const year = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId:Number(process.env.BREVO_BOOKING_REJECT_TEMPLATE_ID),
    params: { firstName, propertyTitle, startDate, endDate, listingsLink, year }
  };
  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

export async function sendBookingCancellation(opts) {
  
  const { userName, toEmail, propertyTitle, propertyCity, startDate, endDate, supportLink } = opts;
  const safeName = sanitizeName(userName);
  const firstName = safeName.split(' ')[0];
  const year = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId:Number(process.env.BREVO_BOOKING_CANCELLATION_TEMPLATE_ID),
    params: { firstName, propertyTitle, propertyCity, startDate, endDate, supportLink, year }
  };
  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}


export async function sendPaymentSuccess(opts) {

  const { userName, toEmail, propertyTitle, amount, paidAt, bookingLink } = opts;
  const safeName = sanitizeName(userName);
  const firstName = safeName.split(' ')[0];
  const year = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_PAYMENT_SUCCESS_TEMPLATE_ID),
    params: { firstName, propertyTitle, amount, paidAt, bookingLink, year }
  };
  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

export async function sendPaymentFailure(opts) {

  const { userName, toEmail, propertyTitle, amount, supportLink } = opts;
  const safeName = sanitizeName(userName);
  const firstName = safeName.split(' ')[0];
  const year = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_PAYMENT_FAILURE_TEMPLATE_ID),
    params: { firstName, propertyTitle, amount, supportLink, year }
  };
  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

export async function sendContactEmail(opts) {

  const { userName, userEmail, subject, message } = opts;
  const safeName = sanitizeName(userName);
  const firstName = safeName.split(' ')[0];
  const year = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: CONTACT_RECEIVER_EMAIL, name: 'Rentify Support' }],
    templateId: BREVO_CONTACT_TEMPLATE_ID,
    params: { firstName, userEmail, subject: subject || '(No subject)', message: message.replace(/\n/g, '<br/>'), year }
  };
  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

export async function addToNewsletterList(email) {

  const url = 'https://api.brevo.com/v3/contacts';
  const payload = { email };
  if (BREVO_LIST_ID) payload.listIds = [Number(BREVO_LIST_ID)];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    try {
      const err = JSON.parse(text);
      if (err.code === 'duplicate_parameter' || err.code === 'duplicate_parameters') {
        // Continue to sending welcome email
      } else {
        throw err;
      }
    } catch {
      console.error('Brevo Contacts API error:', res.status, text);
      throw new Error(`Failed to add contact: ${res.status}`);
    }
  }

  const firstName = sanitizeName(email.split('@')[0]).split(' ')[0];
  const year      = new Date().getFullYear();

  const emailPayload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email, name: firstName }],
    templateId: BREVO_NEWSLETTER_TEMPLATE_ID,
    params: { firstName, year },
  };
  return sendEmail('https://api.brevo.com/v3/smtp/email', emailPayload);
}

export async function sendNewPropertyListingNotification(opts) {

  const { landlordName, propertyTitle, city, propertyId } = opts;
  const safeName  = sanitizeName(landlordName);
  const firstName = safeName.split(' ')[0];
  const year      = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to:     [{ email: 'kubsamlkm@gmail.com', name: 'Admin' },],
    templateId: Number(process.env.BREVO_NEW_PROPERTY_TEMPLATE_ID),
    params: {
      firstName,
      landlordName: safeName,
      propertyTitle,
      city,
      reviewLink: `${process.env.FRONTEND_URL}/admin/properties/${propertyId}`,
      year
    }
  };
  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

export async function sendPropertyApprovalEmail(opts) {

  const { landlordName, toEmail, propertyTitle, propertyId } = opts;
  const safeName  = sanitizeName(landlordName);
  const firstName = safeName.split(' ')[0];
  const year      = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to:     [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_PROPERTY_APPROVAL_TEMPLATE_ID),
    params: {
      firstName,
      propertyTitle,
      listingLink: `${process.env.FRONTEND_URL}/properties/${propertyId}`,
      year
    }
  };
  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

export async function sendPropertyRejectionEmail(opts) {
  
  const { landlordName, toEmail, propertyTitle, reason } = opts;
  const safeName  = sanitizeName(landlordName);
  const firstName = safeName.split(' ')[0];
  const year      = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to:     [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_PROPERTY_REJECTION_TEMPLATE_ID),
    params: {
      firstName,
      propertyTitle,
      reason,
      listingsLink: `${process.env.FRONTEND_URL}/properties/list`,
      year
    }
  };
  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

export async function sendLandlordApplicationPendingAdminEmail(opts) {

  const { applicantName, applicantEmail, reviewLink } = opts; 
  const submittedAt = new Date().toLocaleString();
  const year        = new Date().getFullYear();

  const payload = {
    sender:     { name: SENDER_NAME, email: SENDER_EMAIL },
    to:         [{ email: 'kubsamlkm@gmail.com', name: 'Admin' }],
    templateId: Number(process.env.BREVO_LANDLORD_APPLICATION_PENDING_ADMIN_TEMPLATE_ID),
    params: {
      applicantName,
      applicantEmail,
      submittedAt,
      reviewLink,
      year,
    },
  };

  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

export async function sendLandlordApplicationReceivedEmail(opts) {

  const { userName, toEmail, profileLink, } = opts;
  const safeName  = sanitizeName(userName);
  const firstName = safeName.split(' ')[0];
  const year      = new Date().getFullYear();

  const payload = {
    sender:     { name: SENDER_NAME, email: SENDER_EMAIL },
    to:         [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_LANDLORD_APPLICATION_RECEIVED_TEMPLATE_ID),
    params: {
      firstName,
      profileLink,
      year,
    },
  };

  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}


export async function sendLandlordApplicationApprovedEmail(opts) {

  const { userName, toEmail } = opts;
  const safeName  = sanitizeName(userName);
  const firstName = safeName.split(' ')[0];
  const year      = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_LANDLORD_APPLICATION_APPROVED_TEMPLATE_ID),
    params: {
      firstName,
      dashboardLink: `${process.env.FRONTEND_URL}/properties/list`,
      year
    }
  };

  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}

export async function sendLandlordApplicationRejectedEmail(opts) {

  const { userName, toEmail, reason } = opts;
  const safeName  = sanitizeName(userName);
  const firstName = safeName.split(' ')[0];
  const year      = new Date().getFullYear();

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email: toEmail, name: safeName }],
    templateId: Number(process.env.BREVO_LANDLORD_APPLICATION_REJECTED_TEMPLATE_ID),
    params: {
      firstName,
      reason,
      supportLink: `${process.env.FRONTEND_URL}/contact`,
      year
    }
  };

  return sendEmail('https://api.brevo.com/v3/smtp/email', payload);
}


