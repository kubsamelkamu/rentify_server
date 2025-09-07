import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

async function callRecommenderService(url) {
  return axios.get(url);
}

router.get('/tenant/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data } = await callRecommenderService(`https://rentify-recommendor-1.onrender.com/recommend/tenant/${userId}`);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tenant recommendations.' });
  }
});

router.get('/landlord/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { data } = await callRecommenderService(`https://rentify-recommendor-1.onrender.com/recommend/landlord/${propertyId}`);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch landlord matches.' });
  }
});

export default router;
