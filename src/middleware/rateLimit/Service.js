// src/services/orderService.js

const axios = require('axios');
require('dotenv').config();

// Validation constants
const ORDER_TYPES = {
    TRANSACTION_TYPES: ['BUY', 'SELL'],
    EXCHANGE_SEGMENTS: ['NSE_EQ', 'NSE_FNO', 'BSE_EQ', 'BSE_FNO', 'MCX_COMM'],
    PRODUCT_TYPES: ['CNC', 'INTRADAY', 'MARGIN', 'MTF', 'CO', 'BO'],
    ORDER_TYPES: ['LIMIT', 'MARKET', 'STOP_LOSS', 'STOP_LOSS_MARKET'],
    VALIDITY_TYPES: ['DAY', 'IOC'],
    AMO_TIMES: ['OPEN', 'OPEN_30', 'OPEN_60', 'PRE_OPEN']
};

class OrderService {
    constructor() {
        this.baseURL = process.env.DHAN_API_URL || 'https://api.dhan.co/v2';
        this.accessToken = process.env.DHAN_ACCESS_TOKEN;
        this.dhanClientId = process.env.DHAN_CLIENT_ID;
        
        // Initialize axios instance
        this.api = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'access-token': this.accessToken
            }
        });
    }

    validateOrderParams(params) {
        const errors = [];

        // Required field validations
        if (!params.transactionType || !ORDER_TYPES.TRANSACTION_TYPES.includes(params.transactionType)) {
            errors.push('Invalid or missing transactionType. Must be BUY or SELL');
        }

        if (!params.exchangeSegment || !ORDER_TYPES.EXCHANGE_SEGMENTS.includes(params.exchangeSegment)) {
            errors.push('Invalid or missing exchangeSegment');
        }

        if (params.productType && !ORDER_TYPES.PRODUCT_TYPES.includes(params.productType)) {
            errors.push('Invalid productType');
        }

        if (!params.orderType || !ORDER_TYPES.ORDER_TYPES.includes(params.orderType)) {
            errors.push('Invalid or missing orderType');
        }

        if (!params.validity || !ORDER_TYPES.VALIDITY_TYPES.includes(params.validity)) {
            errors.push('Invalid or missing validity');
        }

        if (params.amoTime && !ORDER_TYPES.AMO_TIMES.includes(params.amoTime)) {
            errors.push('Invalid amoTime');
        }

        // Numeric validations
        if (params.quantity && !Number.isInteger(params.quantity)) {
            errors.push('Quantity must be an integer');
        }

        if (params.disclosedQuantity && !Number.isInteger(params.disclosedQuantity)) {
            errors.push('Disclosed quantity must be an integer');
        }

        if (params.price && typeof params.price !== 'number') {
            errors.push('Price must be a number');
        }

        if (params.triggerPrice && typeof params.triggerPrice !== 'number') {
            errors.push('Trigger price must be a number');
        }

        return errors;
    }

    async placeOrder(orderParams) {
        try {
            // Set default client ID if not provided
            const params = {
                ...orderParams,
                dhanClientId: orderParams.dhanClientId || this.dhanClientId
            };

            // Validate order parameters
            const validationErrors = this.validateOrderParams(params);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Make API call to place order
            const response = await this.api.post('/orders', params);
            return response.data;

        } catch (error) {
            if (error.response) {
                // API error response
                throw new Error(`Order placement failed: ${error.response.data.message || error.response.statusText}`);
            }
            throw error;
        }
    }

    // Helper method for common order types
    async placeCNCOrder(params) {
        return this.placeOrder({
            ...params,
            productType: 'CNC',
            validity: 'DAY'
        });
    }

    async placeIntradayOrder(params) {
        return this.placeOrder({
            ...params,
            productType: 'INTRADAY',
            validity: 'DAY'
        });
    }

    async placeAMOOrder(params) {
        return this.placeOrder({
            ...params,
            afterMarketOrder: true,
            amoTime: params.amoTime || 'OPEN'
        });
    }
}

module.exports = new OrderService();
