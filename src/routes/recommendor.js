import express from 'express';
import { PrismaClient } from '@prisma/client';
import { Parser } from 'json2csv';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/export-recommendation-data', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        role: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        isVerified: true,
      },
    });

    const properties = await prisma.property.findMany({
      select: {
        id: true,
        landlordId: true,
        title: true,
        description: true,
        city: true,
        rentPerMonth: true,
        numBedrooms: true,
        numBathrooms: true,
        propertyType: true,
        amenities: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const bookings = await prisma.booking.findMany({
      select: {
        id: true,
        tenantId: true,
        propertyId: true,
        startDate: true,
        endDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const likes = await prisma.like.findMany({
      select: {
        id: true,
        userId: true,
        propertyId: true,
        createdAt: true,
      },
    });

    const reviews = await prisma.review.findMany({
      select: {
        id: true,
        tenantId: true,
        propertyId: true,
        rating: true,
        title: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const parser = new Parser();
    const csvData = {
      users: parser.parse(users),
      properties: parser.parse(properties),
      bookings: parser.parse(bookings),
      likes: parser.parse(likes),
      reviews: parser.parse(reviews),
    };

    res.json(csvData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to export recommendation data.' });
  }
});

export default router;
