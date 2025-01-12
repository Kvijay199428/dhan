const axios = require('axios');
require('dotenv').config();

// Validation constants
const FOREVER_ORDER_TYPES = {
    ORDER_FLAGS: ['SINGLE', 'OCO'],
    TRANSACTION_TYPES: ['BUY', 'SELL'],
    EXCHANGE_SEGMENTS: ['NSE_EQ', 'NSE_FNO', 'BSE_EQ', 'BSE_FNO'],
    PRODUCT_TYPES: ['CNC', 'MTF', 'MARGIN'],
    ORDER_TYPES: ['LIMIT', 'MARKET']
};

class ForeverOrderService {
    constructor() {
        this.baseURL = process.env.DHAN_API_URL || 'https://api.dhan.co/v2';
        this.accessToken = process.env.DHAN_ACCESS_TOKEN;
        this.dhanClientId = process.env.DHAN_CLIENT_ID;
        
        this.api = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'access-token': this.accessToken
            }
        });
    }

    validateForeverOrderParams(params) {
        const errors = [];

        // Required field validations
        if (!params.orderFlag || !FOREVER_ORDER_TYPES.ORDER_FLAGS.includes(params.orderFlag)) {
            errors.push('Invalid or missing orderFlag. Must be SINGLE or OCO');
        }

        if (!params.transactionType || !FOREVER_ORDER_TYPES.TRANSACTION_TYPES.includes(params.transactionType)) {
            errors.push('Invalid or missing transactionType. Must be BUY or SELL');
        }

        if (!params.exchangeSegment || !FOREVER_ORDER_TYPES.EXCHANGE_SEGMENTS.includes(params.exchangeSegment)) {
            errors.push('Invalid or missing exchangeSegment');
        }

        if (!params.productType || !FOREVER_ORDER_TYPES.PRODUCT_TYPES.includes(params.productType)) {
            errors.push('Invalid or missing productType');
        }

        if (!params.orderType || !FOREVER_ORDER_TYPES.ORDER_TYPES.includes(params.orderType)) {
            errors.push('Invalid or missing orderType');
        }

        if (!params.validity) {
            errors.push('Missing validity');
        }

        if (!params.securityId) {
            errors.push('Missing securityId');
        }

        // Numeric validations
        if (!Number.isInteger(params.quantity) || params.quantity <= 0) {
            errors.push('Quantity must be a positive integer');
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

        // OCO specific validations
        if (params.orderFlag === 'OCO') {
            if (typeof params.price1 !== 'number') {
                errors.push('price1 must be a number for OCO orders');
            }
            if (typeof params.triggerPrice1 !== 'number') {
                errors.push('triggerPrice1 must be a number for OCO orders');
            }
            if (!Number.isInteger(params.quantity1) || params.quantity1 <= 0) {
                errors.push('quantity1 must be a positive integer for OCO orders');
            }
        }

        // Validate disclosed quantity (30% rule)
        if (params.disclosedQuantity) {
            if (params.disclosedQuantity < (params.quantity * 0.3)) {
                errors.push('Disclosed quantity must be at least 30% of the total quantity');
            }
        }

        return errors;
    }

    async placeForeverOrder(orderParams) {
        try {
            // Generate correlation ID if not provided
            const correlationId = orderParams.correlationId || `GTT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const params = {
                dhanClientId: orderParams.dhanClientId || this.dhanClientId,
                correlationId,
                ...orderParams
            };

            // Validate order parameters
            const validationErrors = this.validateForeverOrderParams(params);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Make API call to place forever order
            const response = await this.api.post('/forever/orders', params);
            return response.data;

        } catch (error) {
            if (error.response) {
                throw new Error(`Forever order placement failed: ${error.response.data.message || error.response.statusText}`);
            }
            throw error;
        }
    }

    // Helper methods for common forever order types
    async placeSingleGTTOrder(params) {
        return this.placeForeverOrder({
            ...params,
            orderFlag: 'SINGLE',
            validity: '365', // Default validity of 1 year
        });
    }

    async placeOCOOrder(params) {
        if (!params.price1 || !params.triggerPrice1 || !params.quantity1) {
            throw new Error('OCO orders require price1, triggerPrice1, and quantity1 parameters');
        }

        return this.placeForeverOrder({
            ...params,
            orderFlag: 'OCO',
            validity: '365', // Default validity of 1 year
        });
    }

    async placeLimitGTTOrder(params) {
        return this.placeSingleGTTOrder({
            ...params,
            orderType: 'LIMIT'
        });
    }

    async placeMarketGTTOrder(params) {
        return this.placeSingleGTTOrder({
            ...params,
            orderType: 'MARKET'
        });
    }
}

module.exports = new ForeverOrderService();
