import { prisma } from '../app.js';

export const upsertReview = async (req, res) => {
  
  const { userId, role } = req.user;
  const { propertyId } = req.params;
  const { rating, title, comment } = req.body;

  if (role !== 'TENANT') {
    return res.status(403).json({ error: 'Only tenants can leave reviews.' });
  }

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be a number between 1 and 5.' });
  }
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Title is required.' });
  }
  if (!comment || typeof comment !== 'string') {
    return res.status(400).json({ error: 'Comment is required.' });
  }

  try {

    const bookingExists = await prisma.booking.findFirst({
      where: {
      propertyId,
       tenantId: userId,
       status: 'CONFIRMED', 
      }
     });
    if (!bookingExists) {
      return res.status(403).json({ error: 'You must have a confirmed booking to leave a review.' });
    }

    const review = await prisma.review.upsert({
      where: {
        tenantId_propertyId: { tenantId: userId, propertyId },
      },
      update: {
        rating,
        title,
        comment,
        updatedAt: new Date(),
      },
      create: {
        tenant:   { connect: { id: userId } },
        property: { connect: { id: propertyId } },
        rating,
        title,
        comment,
      },
      include: {
        tenant: { select: { id: true, name: true } },
      },
    });

    return res.json(review);
  } catch{
    return res.status(500).json({ error: 'Could not save review.' });
  }
};

export const getPropertyReviews = async (req, res) => {

  const { propertyId } = req.params;
  const page  = Number(req.query.page)  || 1;
  const limit = Number(req.query.limit) || 5;
  const skip  = (page - 1) * limit;

  try {
    const reviews = await prisma.review.findMany({
      where: { propertyId },
      include: {
        tenant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const aggregation = await prisma.review.aggregate({
      where: { propertyId },
      _avg:   { rating: true },
      _count: { rating: true },
    });

    return res.json({
      reviews,
      averageRating: aggregation._avg?.rating ?? 0,
      count:         aggregation._count.rating ?? 0,
      page,
      limit,
    });
  } catch {
    return res.status(500).json({ error: 'Could not fetch reviews.' });
  }
};

export const deleteReview = async (req, res) => {

  const { userId, role } = req.user;
  const { propertyId } = req.params;

  if (role !== 'TENANT') {
    return res.status(403).json({ error: 'Only tenants can delete their reviews.' });
  }

  try {
    const existingReview = await prisma.review.findUnique({
      where: {
        tenantId_propertyId: { tenantId: userId, propertyId },
      },
      select: { createdAt: true },
    });

    if (!existingReview) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    const now = new Date();
    const createdAt = existingReview.createdAt;
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceCreation > 24) {
      return res.status(403).json({ error: 'Reviews can only be deleted within 24 hours of creation.' });
    }

    await prisma.review.delete({
      where: {
        tenantId_propertyId: { tenantId: userId, propertyId },
      },
    });

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Could not delete review.' });
  }
};