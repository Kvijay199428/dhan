// src/routes/quoteApi.routes.js
const express = require('express');
const router = express.Router();
const rateLimiter = require('../middleware/rateLimiter');
const axios = require('axios');

// Apply rate limiter for all quote routes
router.use(rateLimiter.quoteApiLimiter());

// Get quote for a symbol
router.get('/quotes/:symbol', async (req, res) => {
    try {
        const response = await axios.get(`${process.env.DHAN_API_URL}/quotes/${req.params.symbol}`, {
            headers: { 'access-token': process.env.DHAN_ACCESS_TOKEN }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

// Get multiple quotes
router.post('/quotes/bulk', async (req, res) => {
    try {
        const response = await axios.post(`${process.env.DHAN_API_URL}/quotes/bulk`, req.body, {
            headers: { 'access-token': process.env.DHAN_ACCESS_TOKEN }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

module.exports = router;
