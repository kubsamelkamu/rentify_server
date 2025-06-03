import { prisma } from '../app.js';
import cloudinary from '../config/cloudinary.js';


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
