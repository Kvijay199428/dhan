// src/routes/nonTradingApi.routes.js
const express = require('express');
const router = express.Router();
const rateLimiter = require('../middleware/rateLimiter');
const axios = require('axios');

// Apply rate limiter for all non-trading routes
router.use(rateLimiter.nonTradingApiLimiter());

// Get user profile
router.get('/profile', async (req, res) => {
    try {
        const response = await axios.get(`${process.env.DHAN_API_URL}/users/profile`, {
            headers: { 'access-token': process.env.DHAN_ACCESS_TOKEN }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

// Get holdings
router.get('/holdings', async (req, res) => {
    try {
        const response = await axios.get(`${process.env.DHAN_API_URL}/holdings`, {
            headers: { 'access-token': process.env.DHAN_ACCESS_TOKEN }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

// Get positions
router.get('/positions', async (req, res) => {
    try {
        const response = await axios.get(`${process.env.DHAN_API_URL}/positions`, {
            headers: { 'access-token': process.env.DHAN_ACCESS_TOKEN }
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

module.exports = router;
