import { sendContactEmail } from '../utils/emailService.js';

export const sendContact = async (req, res) => {

  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    await sendContactEmail({
      userName: name,
      userEmail: email,
      subject,
      message,
    });

    return res.status(200).json({ message: 'Your message has been sent successfully.' });
  } catch (error) {
    console.error('ContactController error:', error);
    return res.status(500).json({ error: 'Internal server error. Failed to send your message.' });
  }
};
