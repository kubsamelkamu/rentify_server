import { prisma } from '../app.js';
import cloudinary from '../config/cloudinary.js';

export const applyForLandlord = async (req, res) => {

  const userId = req.user.userId;
  const files = req.files; 

  if (!files || !files.length) {
    return res.status(400).json({ error: 'Please upload at least one document.' });
  }

  try {
    await prisma.roleRequest.upsert({
      where: { userId },
      update: { requestedRole: 'LANDLORD', status: 'PENDING' },
      create: {
        userId,
        requestedRole: 'LANDLORD',
        status: 'PENDING',
      },
    });

    await Promise.all(
      files.map(async (file) => {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'landlord_docs' },
            (err, result) => err ? reject(err) : resolve(result)
          );
          stream.end(file.buffer);
        });

        return prisma.landlordDoc.create({
          data: {
            userId,
            publicId: result.public_id,
            url: result.secure_url,
            docType: file.fieldname, 
          },
        });
      })
    );

    return res.json({ message: 'Application submitted, awaiting admin review.' });
  } catch (err) {
    console.error('applyForLandlord error:', err);
    return res.status(500).json({ error: 'Failed to submit application.' });
  }
};


export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    profilePhoto: true,
    createdAt: true,
    updatedAt: true,
    RoleRequest: {
      select: {
        requestedRole: true,
        status: true,
        createdAt: true,
      },
    },
    landlordDocs: {
      select: {
        id: true,
        url: true,
        docType: true,
        status: true,
        reason: true,
      },
    },
  },
});

    if (!user) {
      return res.status(404).json({ error: 'User not found'});
    }

    return res.json(user);
  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ error: 'Could not fetch profile' });
  }
};

export const updateProfile = async (req, res) => {

  const userId = req.user.userId;
  const { name, email } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (email && email !== existing.email) {
      const conflict = await prisma.user.findUnique({ where: { email } });
      if (conflict) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const data = {
      name: name !== undefined ? name : undefined,
      email: email !== undefined ? email : undefined,
    };

    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'profiles'},
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      data.profilePhoto = result.secure_url;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePhoto: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ error: 'Could not update profile' });
  }
};
