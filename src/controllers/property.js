import { prisma } from '../app.js';
import cloudinary from '../config/cloudinary.js';

export const createProperty = async (req, res) => {
  const { role, userId: landlordId } = req.user;
  if (role !== 'LANDLORD') {
    return res.status(403).json({ error: 'Only landlords can create properties' });
  }

  const {title,description,city,rentPerMonth,numBedrooms,numBathrooms,propertyType,
    amenities,} = req.body;

  if ( !title ||!description ||!city ||rentPerMonth == null ||numBedrooms == null ||
    numBathrooms == null || !propertyType || !Array.isArray(amenities)
  ) {
    return res.status(400).json({ error: 'All fields are required and must be valid' });
  }

  try {
    const newProperty = await prisma.property.create({
      data: {
        title,
        description,
        city,
        rentPerMonth: Number(rentPerMonth),
        numBedrooms: parseInt(numBedrooms, 10),
        numBathrooms: parseInt(numBathrooms, 10),
        propertyType,
        amenities,
        landlord: { connect: { id: landlordId } },
      },
    });
    return res.status(201).json(newProperty);
  } catch (error) {
    return res.status(500).json(error.message);
  }
};

export const getAllProperties = async (req, res) => {
  try {

    const {city,minPrice,maxPrice,minBedrooms,maxBedrooms,propertyType,amenities,page,limit,} = req.query;

    const pageNum = Math.max(parseInt(page, 9) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 9) || 9, 1);
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (typeof city === 'string' && city.trim()) {
      where.city = { contains: city.trim(), mode: 'insensitive' };
    }

    if (minPrice || maxPrice) {
      where.rentPerMonth = {};
      if (minPrice) where.rentPerMonth.gte = parseFloat(minPrice);
      if (maxPrice) where.rentPerMonth.lte = parseFloat(maxPrice);
    }

    if (minBedrooms || maxBedrooms) {
      where.numBedrooms = {};
      if (minBedrooms) where.numBedrooms.gte = parseInt(minBedrooms, 10);
      if (maxBedrooms) where.numBedrooms.lte = parseInt(maxBedrooms, 10);
    }

    if (propertyType && typeof propertyType === 'string') {
      where.propertyType = propertyType;
    }

    if (amenities && typeof amenities === 'string') {
      const list = amenities
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
      if (list.length) {
        where.amenities = { hasEvery: list };
      }
    }

    const [total, data] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'asc' }, 
        include: {
          landlord: { select: { id: true, name: true, email: true } },
          images: true,
        },
      }),
    ]);

    return res.json({
      data,
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch{
    return res.status(500).json({ error: 'Could not fetch properties' });
  }
};

export const getPropertyById = async (req, res) => {
  const { id } = req.params;
  try {
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        landlord: { select: { id: true, name: true, email: true } },
        images: true,
      },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    return res.json(property);
  } catch (error) {
    return res.status(500).json(error.message);
  }
};

export const updateProperty = async (req, res) => {

  const { id } = req.params;
  const { userId } = req.user;

  try {
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    if (property.landlordId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this property' });
    }

    const {title,description,city,rentPerMonth,numBedrooms,numBathrooms,
      propertyType,amenities,} = req.body;

    const updated = await prisma.property.update({
      where: { id },
      data: {
        title,
        description,
        city,
        rentPerMonth: rentPerMonth != null ? Number(rentPerMonth) : undefined,
        numBedrooms: numBedrooms != null ? parseInt(numBedrooms, 10) : undefined,
        numBathrooms: numBathrooms != null ? parseInt(numBathrooms, 10) : undefined,
        propertyType,
        amenities,
      },
    });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json(error.message);
  }
};

export const deleteProperty = async (req, res) => {

  const { id } = req.params;
  const { role, userId } = req.user;

  try {
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.landlordId !== userId && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to delete this property' });
    }

    const images = await prisma.propertyImage.findMany({
      where: { propertyId: id },
    });

    await Promise.all(
      images.map((image) =>
        cloudinary.uploader.destroy(image.publicId)
      )
    );

    await prisma.propertyImage.deleteMany({
      where: { propertyId: id },
    });

    await prisma.property.delete({ where: { id } });
    return res.json({ message: 'Property and its images deleted successfully' });

  } catch (error) {
    return res.status(500).json(error.message);
  }
};

export const uploadPropertyImages = async (req, res) => {

  const { id } = req.params;
  const { role, userId } = req.user;

  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) return res.status(404).json({ error: 'Property not found' });

  if (property.landlordId !== userId && role !== 'ADMIN') {
    return res.status(403).json({ error: 'Not authorized to upload images' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No images provided' });
  }

  try {
    const uploadResults = await Promise.all(
      req.files.map((file) =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'properties' },
            (error, result) => {
              if (error) return reject(error);
              resolve({ result, originalName: file.originalname });
            }
          );
          stream.end(file.buffer);
        })
      )
    );

    const savedImages = await Promise.all(
      uploadResults.map(({ result, originalName }) =>
        prisma.propertyImage.create({
          data: {
            property: { connect: { id } },
            url: result.secure_url,
            publicId: result.public_id,
            fileName: originalName,        
          },
        })
      )
    );

    return res.json(savedImages);
  } catch (error) {
    return res.status(500).json(error.message);
  }
};

