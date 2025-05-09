import { prisma } from '../app.js';

export const createProperty = async (req, res) => {
  const { role, userId: landlordId } = req.user;

  if (role !== 'LANDLORD') {
    return res.status(403).json({ error: 'Only landlords can create properties' });
  }

  const {title,description,city,rentPerMonth,numBedrooms,numBathrooms,propertyType,amenities,} = req.body;

  if (!title || !description || !city || rentPerMonth == null || numBedrooms == null 
    || numBathrooms == null || !propertyType || !Array.isArray(amenities)
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
        // images will be handled later
      },
    });

    return res.status(201).json(newProperty);
  } catch {
    return res.status(500).json({error:'Could not create property'});
  }
};

export const getAllProperties = async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        landlord: { select: { id: true, name: true, email: true } },
        // images and other relations can be included later
      },
    });
    return res.json(properties);
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
        // images and bookings can be included here later 
      },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    return res.json(property);
  } catch{
    return res.status(500).json({ error: 'Could not fetch property' });
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

    // Only landlord owner or admin can update
    if (property.landlordId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this property' });
    }

    const { title,description,city,rentPerMonth,numBedrooms,numBathrooms,propertyType,amenities,} = req.body;

    const updatedProperty = await prisma.property.update({
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

    return res.json(updatedProperty);
  } catch {
    return res.status(500).json({ error: 'Could not update property' });
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

    await prisma.property.delete({ where: { id } });
    return res.json({ message: 'Property deleted successfully' });
  } catch {
    return res.status(500).json({ error: 'Could not delete property' });
  }
};
