import { prisma } from '../app.js';

export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(users);
  } catch{
    return res.status(500).json({ error: 'Could not fetch users' });
  }
};

export const changeUserRole = async (req, res) => {
  const targetUserId = req.params.id;
  const { role } = req.body;
  if (!['TENANT', 'LANDLORD', 'ADMIN'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role value' });
  }
  if (req.user.id === targetUserId && role !== 'ADMIN') {
    return res.status(400).json({ error: 'Cannot change your own admin role' });
  }
  try {
    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: { id: true, name: true, email: true, role: true, updatedAt: true },
    });
    return res.json(updated);
  } catch (err) {
    console.error('changeUserRole error:', err);
    return res.status(500).json({ error: 'Could not update user role' });
  }
};

export const deleteUser = async (req, res) => {
  const targetUserId = req.params.id;
  if (req.user.id === targetUserId) {
    return res.status(400).json({ error: 'Cannot delete your own admin account' });
  }

  try {
    const exists = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.delete({ where: { id: targetUserId } });
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ error: 'Could not delete user' });
  }
};

export const getAllProperties = async (req, res) => {
  try {
    const props = await prisma.property.findMany({
      select: {
        id: true,
        title: true,
        city: true,
        rentPerMonth: true,
        landlordId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(props);
  } catch (err) {
    console.error('getAllProperties error:', err);
    return res.status(500).json({ error: 'Could not fetch properties' });
  }
};

export const deletePropertyByAdmin = async (req, res) => {

  const propId = req.params.id;
  try {
    const exists = await prisma.property.findUnique({ where: { id: propId } });
    if (!exists) {
      return res.status(404).json({ error: 'Property not found' });
    }

    await prisma.property.delete({ where: { id: propId } });
    return res.json({ success: true });
  } catch{
    return res.status(500).json({ error: 'Could not delete property' });
  }
};


export const getAllBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: {
          select: { id: true, name: true, email: true },
        },
        property: {
          select: { id: true, title: true, city: true, rentPerMonth: true },
        },
        payment: {
          select: { status: true, amount: true, paidAt: true },
        },
      },
    });
    return res.json(bookings);
  } catch {
    return res.status(500).json({ error: 'Could not fetch bookings' });
  }
};

export const updateBookingStatus = async (req, res) => {

  const bookingId = req.params.id;
  const { status } = req.body;
  if (!['PENDING','CONFIRMED','REJECTED','CANCELLED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid booking status' });
  }
  try {
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true, city: true, rentPerMonth: true } },
        payment: { select: { status: true, amount: true, paidAt: true } },
      },
    });
    return res.json(updated);
  } catch{
    return res.status(500).json({ error: 'Could not update booking status' });
  }
};

export const getAllReviews = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: { select: { id: true, name: true } },
        property: { select: { id: true, title: true } },
      },
    });
    return res.json(reviews);
  } catch{
    return res.status(500).json({ error: 'Could not fetch reviews' });
  }
};

export const deleteReviewByAdmin = async (req, res) => {
  const reviewId = req.params.id;
  try {
    const exists = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!exists) {
      return res.status(404).json({ error: 'Review not found' });
    }
    await prisma.review.delete({ where: { id: reviewId } });
    return res.json({ success: true });
  } catch{
    return res.status(500).json({ error: 'Could not delete review' });
  }
};

export const getSiteMetrics = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalProperties = await prisma.property.count();
    const totalBookings = await prisma.booking.count();
    const totalReviews = await prisma.review.count();
    const revenueResult = await prisma.payment.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amount: true },
    });
    const totalRevenue = revenueResult._sum.amount || 0;

    return res.json({
      totalUsers,
      totalProperties,
      totalBookings,
      totalReviews,
      totalRevenue,
    });
  } catch{
    return res.status(500).json({ error: 'Could not fetch metrics' });
  }
};


