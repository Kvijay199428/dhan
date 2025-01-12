// src/routes/dataApi.routes.js
const express = require('express');
const router = express.Router();
const rateLimiter = require('../middleware/rateLimiter');
const axios = require('axios');

// Apply rate limiter for all data routes
router.use(rateLimiter.dataApiLimiter());

// Get market data
router.get('/market-data/:symbol', async (req, res) => {
    try {
        const response = await axios.get(`${process.env.DHAN_API_URL}/data/market/${req.params.symbol}`, {
            headers: { 'access-token': process.env.DHAN_ACCESS_TOKEN }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

// Get historical data
router.get('/historical/:symbol', async (req, res) => {
    try {
        const response = await axios.get(`${process.env.DHAN_API_URL}/data/historical/${req.params.symbol}`, {
            headers: { 'access-token': process.env.DHAN_ACCESS_TOKEN },
            params: req.query // interval, from, to
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

module.exports = router;
