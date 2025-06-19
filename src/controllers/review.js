import { prisma } from '../app.js';

export const upsertReview = async (req, res) => {

  const { userId, role } = req.user;
  const { propertyId }   = req.params;
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
        status:   'CONFIRMED'
      }
    });
    if (!bookingExists) {
      return res.status(403).json({
        error: 'You must have a confirmed booking to leave a review.'
      });
    }

    const review = await prisma.review.upsert({
      where: {
        tenantId_propertyId: { tenantId: userId, propertyId }
      },
      update: {
        rating,
        title,
        comment,
        updatedAt: new Date()
      },
      create: {
        tenant:   { connect: { id: userId } },
        property: { connect: { id: propertyId } },
        rating,
        title,
        comment
      },
      include: {
        tenant: { select: { id: true, name: true } }
      }
    });

    res.json(review);

    setImmediate(() => {
      const io = req.app.get('io');
      const eventName = review.createdAt.getTime() === review.updatedAt.getTime()
        ? 'admin:newReview'
        : 'admin:updateReview';

      io.emit(eventName, review);
    });
  } catch (err) {
    console.error('upsertReview error:', err);
    res.status(500).json({ error: 'Could not save review.' });
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
        tenant: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const aggregation = await prisma.review.aggregate({
      where: { propertyId },
      _avg:   { rating: true },
      _count: { rating: true }
    });

    res.json({
      reviews,
      averageRating: aggregation._avg?.rating ?? 0,
      count:         aggregation._count.rating ?? 0,
      page,
      limit
    });
  } catch (err) {
    console.error('getPropertyReviews error:', err);
    res.status(500).json({ error: 'Could not fetch reviews.' });
  }
};


export const deleteReview = async (req, res) => {

  const { userId, role } = req.user;
  const { propertyId }   = req.params;

  if (role !== 'TENANT') {
    return res.status(403).json({ error: 'Only tenants can delete their reviews.' });
  }

  try {
    const existing = await prisma.review.findUnique({
      where: {
        tenantId_propertyId: { tenantId: userId, propertyId }
      },
      select: { createdAt: true }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Review not found.' });
    }

    const hoursSince = (Date.now() - existing.createdAt.getTime()) / 36e5;
    if (hoursSince > 24) {
      return res.status(403).json({
        error: 'Reviews can only be deleted within 24 hours of creation.'
      });
    }

    await prisma.review.delete({
      where: {
        tenantId_propertyId: { tenantId: userId, propertyId }
      }
    });

    res.json({ success: true });
    setImmediate(() => {
      const io = req.app.get('io');
      io.emit('admin:deleteReview', { propertyId, tenantId: userId });
    });
  } catch (err) {
    console.error('deleteReview error:', err);
    res.status(500).json({ error: 'Could not delete review.' });
  }
};
