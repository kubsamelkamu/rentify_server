import { prisma } from '../app.js';

export const sendMessage = async (req, res) => {

  const { id: propertyId } = req.params;
  const { userId: senderId } = req.user;
  const { content } = req.body;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Message content is required' });
  }

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { landlordId: true },
    });
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const receiverId = property.landlordId;

    const message = await prisma.message.create({
      data: {
        sender: { connect: { id: senderId } },
        receiver: { connect: { id: receiverId } },
        property: { connect: { id: propertyId } },
        content,
      },
    });

    return res.status(201).json(message);
  }catch {
    return res.status(500).json({ error: 'Could not send message' });
  }
};
