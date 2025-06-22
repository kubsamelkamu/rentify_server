import { prisma } from '../app.js';
import cloudinary from '../config/cloudinary.js';
import { sendNewPropertyListingNotification } from '../utils/emailService.js';

export const createProperty = async (req, res) => {

  const { role, userId: landlordId } = req.user;
  if (role !== 'LANDLORD') {
    return res.status(403).json({ error: 'Only landlords can create properties' });
  }

  const {title,description,city,rentPerMonth,numBedrooms,numBathrooms,propertyType,amenities,
  } = req.body;

  if (!title ||!description ||!city ||rentPerMonth == null ||numBedrooms == null ||numBathrooms == null ||!propertyType ||
    !Array.isArray(amenities)
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
        status: 'PENDING',
      },
    });

    const io = req.app.get('io');
    io.emit('listing:pending', newProperty);
    let landlordName = 'Landlord';
    try {
      const landlord = await prisma.user.findUnique({ where: { id: landlordId } });
      if (landlord && landlord.name) landlordName = landlord.name;
    } catch (e) {
      console.warn('Could not fetch landlord name for email:', e);
    }

    try {
      await sendNewPropertyListingNotification({
        landlordName,
        propertyTitle: newProperty.title,
        city: newProperty.city,
        propertyId: newProperty.id,
      });
    } catch (emailErr) {
      console.error('Failed to send new listing notification:', emailErr);
    }

    return res.status(201).json(newProperty);
  } catch (error) {
    console.error('createProperty error:', error);
    return res.status(500).json({ error: 'Could not create property' });
  }
};

export const getAllProperties = async (req, res) => {
  
  try {
    const {city,minPrice,maxPrice,minBedrooms,maxBedrooms,propertyType,amenities,availableFrom,availableTo,page,limit,
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 9, 1);
    const skip = (pageNum - 1) * limitNum;

    const where = { status: 'APPROVED' };

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
      const list = amenities.split(',').map((a) => a.trim()).filter(Boolean);
      if (list.length) where.amenities = { hasEvery: list };
    }
    if (availableFrom && availableTo) {
      const from = new Date(availableFrom);
      const to = new Date(availableTo);
      if (from < to) {
        where.bookings = {
          none: {
            status: 'CONFIRMED',
            OR: [{ startDate: { lte: to }, endDate: { gte: from } }],
          },
        };
      }
    }

    const [total, data] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          landlord: { select: { id: true, name: true, email: true } },
          images: true,
        },
      }),
    ]);

    res.json({ data, total, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error('getAllProperties error:', error);
    res.status(500).json({ error: 'Could not fetch properties' });
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
        Message: {
          include: { sender: { select: { id: true, name: true } } },
          orderBy: { sentAt: 'asc' },
        },
      },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const { Message, ...rest } = property;
    res.json({ ...rest, messages: Message });
  } catch {
    res.status(500).json({ error: 'Could not fetch property' });
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

    const {
      title, description, city, rentPerMonth, numBedrooms, numBathrooms, propertyType, amenities,
    } = req.body;

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

    const io = req.app.get('io');
    io.emit('admin:updatedProperty', updated);

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not update property' });
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

    const images = await prisma.propertyImage.findMany({ where: { propertyId: id } });
    await Promise.all(images.map((img) => cloudinary.uploader.destroy(img.publicId)));
    await prisma.propertyImage.deleteMany({ where: { propertyId: id } });
    await prisma.property.delete({ where: { id } });

    const io = req.app.get('io');
    io.emit('admin:deletedProperty', id);

    res.json({ message: 'Property and its images deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not delete property' });
  }
};

export const uploadPropertyImages = async (req, res) => {
  
  const { id } = req.params;
  const { role, userId } = req.user;

  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) {
    return res.status(404).json({ error: 'Property not found' });
  }
  if (property.landlordId !== userId && role !== 'ADMIN') {
    return res.status(403).json({ error: 'Not authorized to upload images' });
  }
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No images provided' });
  }

  try {
    const uploadResults = await Promise.all(
      req.files.map(
        (file) =>
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

    res.json(savedImages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not upload images' });
  }
};
