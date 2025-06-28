import { prisma } from '../app.js';
import { sendLandlordPromotion , sendPropertyApprovalEmail,sendPropertyRejectionEmail,
sendLandlordApplicationApprovedEmail,sendLandlordApplicationRejectedEmail} from '../utils/emailService.js';
import ExcelJS from 'exceljs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export const getAllUsers = async (req, res) => {
  try {
    const page  = parseInt(req.query.page  || '1', 10);
    const limit = parseInt(req.query.limit || '5', 10);
    const search = req.query.search || '';

    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
      return res.status(400).json({ error: 'page and limit must be positive integers' });
    }

    const skip = (page - 1) * limit;
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const totalUsers = await prisma.user.count({ where: whereClause });

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return res.json({
      data: users,
      meta: {
        totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (err) {
    console.error('getAllUsers error:', err);
    return res.status(500).json({ error: 'Could not fetch users' });
  }
};

export const exportUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Users');

    sheet.columns = [
      { header: 'Name',      key: 'name',      width: 30 },
      { header: 'Email',     key: 'email',     width: 30 },
      { header: 'Role',      key: 'role',      width: 15 },
      { header: 'Joined At', key: 'createdAt', width: 20 },
    ];

    users.forEach(u => {
      sheet.addRow({
        name:      u.name,
        email:     u.email,
        role:      u.role,
        createdAt: u.createdAt.toISOString(),
      });
    });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="rentify-users.xlsx"'
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('exportUsers error:', err);
    res.status(500).json({ error: 'Could not export users' });
  }
};

export const changeUserRole = async (req, res) => {

  const targetUserId = req.params.id;
  const { role }     = req.body;

  if (!['TENANT', 'LANDLORD', 'ADMIN'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role value' });
  }
  if (req.user.id === targetUserId && role === 'ADMIN') {
    return res.status(400).json({ error: 'Cannot change your own admin role' });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: {
        id:           true,
        name:         true,
        email:        true,
        role:         true,
        profilePhoto: true,
        createdAt:    true  
      },
    });

    if (role === 'LANDLORD') {
      try {
        await sendLandlordPromotion({
          userName: updatedUser.name || 'User',
          toEmail:  updatedUser.email,
        });
      } catch (emailErr) {
        console.error('sendLandlordPromotion error:', emailErr);
      }
    }

    const tokenPayload = { userId: updatedUser.id, role: updatedUser.role };
    const newToken     = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

    return res.json({
      user: {
        id:           updatedUser.id,
        name:         updatedUser.name,
        email:        updatedUser.email,
        role:         updatedUser.role,
        profilePhoto: updatedUser.profilePhoto,
        createdAt:    updatedUser.createdAt
      },
      token: newToken,
    });
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

export const listLandlordRequests = async (req, res) => {

  try {
    const page   = Math.max(parseInt(req.query.page,  10) || 1,  1);
    const limit  = Math.max(parseInt(req.query.limit, 10) || 5,  1);
    const status = req.query.status || 'PENDING';

    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    const where = { requestedRole: 'LANDLORD', status };
    const totalRequests = await prisma.roleRequest.count({ where });
    const skip = (page - 1) * limit;
    const raw = await prisma.roleRequest.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePhoto: true,
            landlordDocs: {
              select: { id: true, url: true, docType: true, status: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const requests = raw.map((r) => ({
      id: r.user.id,
      name: r.user.name,
      email: r.user.email,
      profilePhoto: r.user.profilePhoto,
      landlordDocs: r.user.landlordDocs,
      requestStatus: r.status,
      requestedAt:  r.createdAt,
    }));

    const totalPages = Math.ceil(totalRequests / limit);

    return res.json({
      requests,
      page,
      totalPages,
      totalRequests,
    });
  } catch (err) {
    console.error('listLandlordRequests error:', err);
    return res.status(500).json({ error: 'Could not fetch landlord requests' });
  }
};


export const approveLandlord = async (req, res) => {
  const adminId = req.user.userId;
  const { userId } = req.params;

  try {
    await prisma.$transaction([
      prisma.roleRequest.update({
        where: { userId },
        data: { status: 'APPROVED' },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { role: 'LANDLORD' },
      }),
      prisma.landlordDoc.updateMany({
        where: { userId },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewerId: adminId,
        },
      }),
    ]);

    const applicant = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    if (applicant) {
      try {
        await sendLandlordApplicationApprovedEmail({
          userName: applicant.name,
          toEmail:  applicant.email,
        });
      } catch (emailErr) {
        console.error('Failed to send landlord-approved email:', emailErr);
      }
    }
    return res.json({ message: 'Landlord application approved.' });
  } catch (err) {
    console.error('approveLandlord error:', err);
    return res.status(500).json({ error: 'Could not approve application' });
  }
};

export const rejectLandlord = async (req, res) => {

  const adminId = req.user.userId;
  const { userId } = req.params;
  const { reason } = req.body;

  if (!reason || typeof reason !== 'string') {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  try {
    await prisma.$transaction([
      prisma.roleRequest.update({
        where: { userId },
        data: { status: 'REJECTED' },
      }),
      prisma.landlordDoc.updateMany({
        where: { userId },
        data: {
          status: 'REJECTED',
          reason,
          reviewedAt: new Date(),
          reviewerId: adminId,
        },
      }),
    ]);

    const applicant = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (applicant) {
      try {
        await sendLandlordApplicationRejectedEmail({
          userName: applicant.name,
          toEmail:  applicant.email,
          reason,
        });
      } catch (emailErr) {
        console.error('Failed to send landlord-rejected email:', emailErr);
      }
    }

    return res.json({ message: 'Landlord application rejected.' });
  } catch (err) {
    console.error('rejectLandlord error:', err);
    return res.status(500).json({ error: 'Could not reject application' });
  }
};


export const getAllProperties = async (req, res) => {

  try {
    const page  = parseInt(req.query.page  || '1', 10);
    const limit = parseInt(req.query.limit || '5', 10);
    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
      return res.status(400).json({ error: 'page and limit must be positive integers' });
    }

    const skip            = (page - 1) * limit;
    const totalProperties = await prisma.property.count();

    const props = await prisma.property.findMany({
      select: {
        id: true,
        title: true,
        city: true,
        rentPerMonth: true,
        landlordId: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
      },

      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return res.json({
      data: props,
      meta: {
        totalProperties,
        page,
        limit,
        totalPages: Math.ceil(totalProperties / limit),
      },
    });
  } catch{
    return res.status(500).json({ error: 'Could not fetch properties' });
  }
};

export const approveProperty = async (req, res) => {

  const propId = req.params.id;
  try {
    const updated = await prisma.property.update({
      where: { id: propId },
      data: { status: 'APPROVED', rejectionReason: null },
    });

    const io = req.app.get('io');
    io.emit('listing:approved', updated);

    const landlord = await prisma.user.findUnique({ where: { id: updated.landlordId } });
    try {
      await sendPropertyApprovalEmail({
        landlordName: landlord.name,
        toEmail: landlord.email,
        propertyTitle: updated.title,
        propertyId: updated.id,
      });
    } catch (emailErr) {
      console.error('Failed to send approval email:', emailErr);
    }

    return res.json(updated);
  } catch (error) {
    console.error('approveProperty error:', error);
    return res.status(500).json({ error: 'Could not approve property' });
  }
};

export const rejectProperty = async (req, res) => {

  const propId = req.params.id;
  const { reason } = req.body;

  if (!reason || typeof reason !== 'string') {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  try {
    const updated = await prisma.property.update({
      where: { id: propId },
      data: { status: 'REJECTED', rejectionReason: reason },
    });

    const io = req.app.get('io');
    io.emit('listing:rejected', updated);

    const landlord = await prisma.user.findUnique({ where: { id: updated.landlordId } });
    try {
      await sendPropertyRejectionEmail({
        landlordName: landlord.name,
        toEmail: landlord.email,
        propertyTitle: updated.title,
        reason: updated.rejectionReason,
      });

    } catch (emailErr) {
      console.error('Failed to send rejection email:', emailErr);
    }
    return res.json(updated);
  } catch (error) {
    console.error('rejectProperty error:', error);
    return res.status(500).json({ error: 'Could not reject property' });
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
  } catch (err) {
    console.error('deletePropertyByAdmin error:', err);
    return res.status(500).json({ error: 'Could not delete property' });
  }
};

export const getAllBookings = async (req, res) => {
  
  try {
    const page  = parseInt(req.query.page  || '1', 10);
    const limit = parseInt(req.query.limit || '5', 10);
    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
      return res.status(400).json({ error: 'page and limit must be positive integers' });
    }

    const skip          = (page - 1) * limit;
    const totalBookings = await prisma.booking.count();

    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        tenant:   { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true, city: true, rentPerMonth: true } },
        payment:  { select: { status: true, amount: true, paidAt: true } },
      },
    });

    return res.json({
      data: bookings,
      meta: {
        totalBookings,
        page,
        limit,
        totalPages: Math.ceil(totalBookings / limit),
      },
    });
  } catch (err) {
    console.error('getAllBookings error:', err);
    return res.status(500).json({ error: 'Could not fetch bookings' });
  }
};

export const updateBookingStatus = async (req, res) => {

  const bookingId = req.params.id;
  const { status } = req.body;
  if (!['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid booking status' });
  }

  try {
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        tenant:   { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true, city: true, rentPerMonth: true } },
        payment:  { select: { status: true, amount: true, paidAt: true } },
      },
    });
    return res.json(updated);
  } catch (err) {
    console.error('updateBookingStatus error:', err);
    return res.status(500).json({ error: 'Could not update booking status' });
  }
};

export const getAllReviews = async (req, res) => {

  try {
    const page  = parseInt(req.query.page  || '1', 10);
    const limit = parseInt(req.query.limit || '5', 10);
    if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
      return res.status(400).json({ error: 'page and limit must be positive integers' });
    }

    const skip        = (page - 1) * limit;
    const totalReviews = await prisma.review.count();

    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        tenant:   { select: { id: true, name: true } },
        property: { select: { id: true, title: true } },
      },
    });

    return res.json({
      data: reviews,
      meta: {
        totalReviews,
        page,
        limit,
        totalPages: Math.ceil(totalReviews / limit),
      },
    });
  } catch (err) {
    console.error('getAllReviews error:', err);
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
  } catch (err) {
    console.error('deleteReviewByAdmin error:', err);
    return res.status(500).json({ error: 'Could not delete review' });
  }
};

export const getSiteMetrics = async (req, res) => {
  
  try {
    const totalUsers      = await prisma.user.count();
    const totalProperties = await prisma.property.count();
    const totalBookings   = await prisma.booking.count();
    const totalReviews    = await prisma.review.count();
    const revenueResult   = await prisma.payment.aggregate({
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
  } catch (err) {
    console.error('getSiteMetrics error:', err);
    return res.status(500).json({ error: 'Could not fetch metrics' });
  }
};
