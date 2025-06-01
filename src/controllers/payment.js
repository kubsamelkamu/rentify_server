import { prisma } from '../app.js';
import axios from 'axios';
import { io } from '../server.js';   

const CHAPA_SECRET   = process.env.CHAPA_SECRET_KEY;
const CHAPA_BASE_URL = 'https://api.chapa.co/v1';

export const initiatePayment = async (req, res) => {

  const { bookingId } = req.body;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      payment:  true,
      property: { select: { rentPerMonth: true, id: true, landlordId: true } },
      tenant:   { select: { email: true, id: true } },
    },
  });

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  if (booking.status !== 'CONFIRMED') {
    return res.status(400).json({ error: 'Booking is not confirmed' });
  }
  if (booking.payment) {
    return res.status(400).json({ error: 'Payment already initiated' });
  }

  const days   = (booking.endDate.getTime() - booking.startDate.getTime()) / (1000 * 60 * 60 * 24);
  const amount = Number(booking.property.rentPerMonth) * (days / 30);

  const payment = await prisma.payment.create({
    data: {
      booking:  { connect: { id: bookingId } },
      amount,
      currency: 'ETB',
      status:   'PENDING',
    },
  });

  try {
    const chapaRes = await axios.post(
      `${CHAPA_BASE_URL}/transaction/initialize/`,
      {
        amount:       amount.toFixed(2),
        currency:     'ETB',
        email:        booking.tenant.email,
        tx_ref:       payment.id,
        callback_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
        return_url:   `${process.env.FRONTEND_URL}/payments/success?bookingId=${bookingId}`,
      },
      {
        headers: { Authorization: `Bearer ${CHAPA_SECRET}` },
      }
    );

    await prisma.payment.update({
      where: { id: payment.id },
      data:  { transactionId: chapaRes.data.data.id },
    });

    return res.json({
      checkoutUrl: chapaRes.data.data.checkout_url,
      paymentId:   payment.id,
    });
  } catch (err) {
    console.error('Chapa init error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Could not initiate payment' });
  }
};

export const handleWebhook = async (req, res) => {
  const { data } = req.body;
  const txRef    = data.tx_ref;   
  const status   = data.status;  
  const mapped   = status === 'success' ? 'SUCCESS' : 'FAILED';

  const payment = await prisma.payment.update({
    where: { id: txRef },
    data: {
      status: mapped,
      paidAt: mapped === 'SUCCESS' ? new Date() : undefined,
    },
    include: {
      booking: {
        select: {
          id:        true,
          tenantId:  true,
          property: { select: { landlordId: true } },
        },
      },
    },
  });

  const tenantRoom   = `user_${payment.booking.tenantId}`;
  const landlordRoom = `landlord_${payment.booking.property.landlordId}`;

  io.to(tenantRoom).emit('paymentStatusUpdated', {
    bookingId:     payment.booking.id,
    paymentStatus: payment.status,
  });

  io.to(landlordRoom).emit('paymentStatusUpdated', {
    bookingId:     payment.booking.id,
    paymentStatus: payment.status,
  });

  res.json({ status: 'ok' });
};
