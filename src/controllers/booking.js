import { prisma } from '../app.js';
import {sendBookingConfirmation,sendBookingRejection,sendBookingCancellation,sendBookingRequest} from '../utils/emailService.js';

export const requestBooking = async (req, res) => {

  const { userId, role } = req.user;
  const { propertyId, startDate, endDate } = req.body;

  if (role !== 'TENANT')
    return res.status(403).json({ error: 'Only tenants can request bookings' });
  if (!propertyId || !startDate || !endDate)
    return res.status(400).json({ error: 'propertyId, startDate and endDate are required' });

  const start = new Date(startDate);
  const end   = new Date(endDate);
  if (start >= end)
    return res.status(400).json({ error: 'startDate must be before endDate' });

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        title: true,
        city: true,
        landlordId: true,
        landlord: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!property)
      return res.status(404).json({ error: 'Property not found' });
    if (!property.landlordId)
      return res.status(400).json({ error: 'Property not available for booking' });
    if (property.landlordId === userId)
      return res.status(403).json({ error: 'Cannot book your own property' });

    const tenant = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    if (!tenant)
    return res.status(404).json({ error: 'Tenant not found' });
    const conflict = await prisma.booking.findFirst({
      where: {
        propertyId,
        status: 'CONFIRMED',
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } }
        ]
      }
    });

    if (conflict)
      return res.status(409).json({ error: 'Dates are unavailable' });

    const booking = await prisma.booking.create({
      data: {
        tenant: { connect: { id: userId } },
        property: { connect: { id: propertyId } },
        startDate: start,
        endDate: end,
        status: 'PENDING'
      }
    });

    res.status(201).json(booking);

    const startStr = start.toISOString().split('T')[0];
    const endStr   = end.toISOString().split('T')[0];
    setImmediate(async () => {
      try {
        await sendBookingRequest({
          landlordName:  property.landlord.name,
          toEmail:       property.landlord.email,
          propertyTitle: property.title || 'N/A',
          propertyCity:  property.city  || 'N/A',
          startDate:     startStr,
          endDate:       endStr,
          tenantName:    tenant.name    || 'Tenant',
          tenantEmail:   tenant.email   || '(no email)',
          bookingLink:   `${process.env.FRONTEND_URL}/landlord/bookings`
        });
      } catch (emailErr) {
        console.error('Booking request email error:', emailErr);
      }
    });

    setImmediate(() => {
      const io = req.app.get('io');
      io.emit('newBooking', booking);
      io.to(`property_${propertyId}`).emit('newBooking', booking);
      io.to(`user_${userId}`).emit('newBooking', booking);
      io.to(`landlord_${property.landlordId}`).emit('newBooking', booking);
    });

  } catch (err) {
    console.error('requestBooking error:', err);
    res.status(500).json({ error: 'Could not create booking' });
  }
};



export const getPropertyBookings = async (req, res) => {

  const { userId, role }  = req.user;
  const { propertyId }    = req.params;

  if (role !== 'LANDLORD') {
    return res.status(403).json({ error: 'Only landlords can view bookings for their properties' });
  }
  try {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    if (property.landlordId !== userId) {
      return res.status(403).json({ error: 'Not authorized to view bookings for this property' });
    }

    const bookings = await prisma.booking.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'desc' },
      include: {
        tenant:   { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true, city: true, rentPerMonth: true } }
      }
    });

    res.json(bookings);
  } catch (err) {
    console.error('getPropertyBookings error:', err);
    res.status(500).json({ error: 'Could not fetch bookings' });
  }
};

export const confirmBooking = async (req, res) => {

  const { userId, role }   = req.user;
  const { id: bookingId }  = req.params;

  if (role !== 'LANDLORD') {
    return res.status(403).json({ error: 'Only landlords can confirm bookings' });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { property: { select: { landlordId: true } } }
    });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.property.landlordId !== userId) {
      return res.status(403).json({ error: 'Not authorized to confirm this booking' });
    }
    if (booking.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending bookings can be confirmed' });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' },
      include: {
        property: { select: { id: true, title: true, city: true, rentPerMonth: true, landlordId: true } },
        tenant:   { select: { id: true, name: true, email: true } },
        payment:  { select: { amount: true, currency: true } }
      }
    });

    res.json(updated);

    setImmediate(() => {
      const io = req.app.get('io');
      io.emit('bookingStatusUpdate', updated);
      io.to(`property_${updated.propertyId}`).emit('bookingStatusUpdate', updated);
      io.to(`user_${updated.tenantId}`).emit('bookingStatusUpdate', updated);
      io.to(`landlord_${updated.property.landlordId}`).emit('bookingStatusUpdate', updated);
    });

    try {
      await sendBookingConfirmation({
        userName:      updated.tenant.name,
        toEmail:       updated.tenant.email,
        propertyTitle: updated.property.title,
        propertyCity:  updated.property.city,
        startDate:     updated.startDate.toISOString().split('T')[0],
        endDate:       updated.endDate.toISOString().split('T')[0],
        rentPerMonth:  updated.property.rentPerMonth,
        bookingLink:   `${process.env.FRONTEND_URL}/bookings`
      });
    } catch (emailErr) {
      console.error('Booking confirmation email error:', emailErr);
    }
  } catch (err) {
    console.error('confirmBooking error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Could not confirm booking' });
    }
  }
};

export const rejectBooking = async (req, res) => {

  const { userId, role }   = req.user;
  const { id: bookingId }  = req.params;

  if (role !== 'LANDLORD') {
    return res.status(403).json({ error: 'Only landlords can reject bookings' });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { property: { select: { landlordId: true } } }
    });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.property.landlordId !== userId) {
      return res.status(403).json({ error: 'Not authorized to reject this booking' });
    }
    if (booking.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending bookings can be rejected' });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'REJECTED' },
      include: {
        property: { select: { id: true, title: true, city: true, landlordId: true } },
        tenant:   { select: { id: true, name: true, email: true } }
      }
    });

    res.json(updated);

    setImmediate(() => {
      const io = req.app.get('io');
      io.emit('bookingStatusUpdate', updated);
      io.to(`property_${updated.propertyId}`).emit('bookingStatusUpdate', updated);
      io.to(`user_${updated.tenantId}`).emit('bookingStatusUpdate', updated);
      io.to(`landlord_${updated.property.landlordId}`).emit('bookingStatusUpdate', updated);
    });

    sendBookingRejection({
      userName:      updated.tenant.name,
      toEmail:       updated.tenant.email,
      propertyTitle: updated.property.title,
      startDate:     updated.startDate.toISOString().split('T')[0],
      endDate:       updated.endDate.toISOString().split('T')[0],
      listingsLink:  `${process.env.FRONTEND_URL}/properties`
    }).catch(err => console.error('Booking rejection email error:', err));

  } catch (err) {
    console.error('rejectBooking error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Could not reject booking' });
    }
  }
};


export const cancelBooking = async (req, res) => {

  const { userId, role }   = req.user;
  const { id: bookingId }  = req.params;

  if (role !== 'TENANT') {
    return res.status(403).json({ error: 'Only tenants can cancel bookings' });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: { select: { landlordId: true } },
        tenant:   { select: { id: true } }
      }
    });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.tenantId !== userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this booking' });
    }
    if (booking.status === 'CONFIRMED') {
      return res.status(400).json({ error: 'Cannot cancel a confirmed booking' });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
      include: {
        property: { select: { id: true, title: true, city: true, rentPerMonth: true, landlordId: true } },
        tenant:   { select: { id: true, name: true, email: true } }
      }
    });

    res.json(updated);
    setImmediate(() => {
      const io = req.app.get('io');
      io.emit('bookingStatusUpdate', updated);

      io.to(`property_${updated.propertyId}`).emit('bookingStatusUpdate', updated);
      io.to(`user_${updated.tenantId}`).emit('bookingStatusUpdate', updated);
      io.to(`landlord_${updated.property.landlordId}`).emit('bookingStatusUpdate', updated);
    });

    sendBookingCancellation({
      userName:      updated.tenant.name,
      toEmail:       updated.tenant.email,
      propertyTitle: updated.property.title,
      propertyCity:  updated.property.city,
      startDate:     updated.startDate.toISOString().split('T')[0],
      endDate:       updated.endDate.toISOString().split('T')[0],
      supportLink:   `${process.env.FRONTEND_URL}/help`
    }).catch(err => console.error('Booking cancellation email error:', err));

  } catch (err) {
    console.error('cancelBooking error:', err);
    res.status(500).json({ error: 'Could not cancel booking' });
  }
};

export const getUserBookings = async (req, res) => {

  const { userId, role } = req.user;
  if (role !== 'TENANT') {
    return res.status(403).json({ error: 'Only tenants can view their bookings' });
  }
  try {
    const bookings = await prisma.booking.findMany({
      where: { tenantId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { id: true, title: true, city: true, rentPerMonth: true } },
        payment:  true
      }
    });
    res.json(bookings);
  } catch (err) {
    console.error('getUserBookings error:', err);
    res.status(500).json({ error: 'Could not fetch your bookings' });
  }
};


export const getLandlordBookings = async (req, res) => {
  
  const { userId, role } = req.user;
  if (role !== 'LANDLORD') {
    return res.status(403).json({ error: 'Only landlords can view these bookings' });
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: { property: { landlordId: userId } },
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { id: true, title: true, city: true, rentPerMonth: true } },
        tenant:   { select: { id: true, name: true, email: true } },
        payment:  { select: { status: true } }
      }
    });
    res.json(bookings);
  } catch (err) {
    console.error('getLandlordBookings error:', err);
    res.status(500).json({ error: 'Could not fetch landlord bookings' });
  }
};
