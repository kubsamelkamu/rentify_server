import { addToNewsletterList } from '../utils/emailService.js';

export const addSubscriber = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    await addToNewsletterList(email);
    return res.status(200).json({ message: 'Subscribed!' });
  } catch (err) {
    console.error('newsletterController error:', err);
    return res.status(500).json({ error: 'Failed to subscribe' });
  }
};
