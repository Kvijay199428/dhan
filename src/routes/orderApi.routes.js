// src/routes/orderApi.routes.js
const express = require('express');
const router = express.Router();
const rateLimiter = require('../middleware/rateLimiter');
const orderService = require('../services/orderService');

// Apply rate limiter for all order routes
router.use(rateLimiter.orderApiLimiter());

// Place new order
router.post('/orders', async (req, res) => {
    try {
        const order = await orderService.placeOrder(req.body);
        res.json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Place CNC order
router.post('/orders/cnc', async (req, res) => {
    try {
        const order = await orderService.placeCNCOrder(req.body);
        res.json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Place Intraday order
router.post('/orders/intraday', async (req, res) => {
    try {
        const order = await orderService.placeIntradayOrder(req.body);
        res.json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Place AMO order
router.post('/orders/amo', async (req, res) => {
    try {
        const order = await orderService.placeAMOOrder(req.body);
        res.json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
