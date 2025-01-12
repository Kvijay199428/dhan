const axios = require('axios');
require('dotenv').config();

// Constants for validation
const MARGIN_CONSTANTS = {
    EXCHANGE_SEGMENTS: ['NSE_EQ', 'NSE_FNO', 'BSE_EQ', 'BSE_FNO', 'MCX_COMM'],
    TRANSACTION_TYPES: ['BUY', 'SELL'],
    PRODUCT_TYPES: ['CNC', 'INTRADAY', 'MARGIN', 'MTF', 'CO', 'BO']
};

class MarginCalculatorService {
    constructor() {
        this.baseURL = process.env.DHAN_API_URL || 'https://api.dhan.co/v2';
        this.accessToken = process.env.DHAN_ACCESS_TOKEN;
        
        this.api = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'access-token': this.accessToken
            }
        });
    }

    validateMarginParams(params) {
        const errors = [];

        // Validate required fields
        if (!params.dhanClientId) {
            errors.push('dhanClientId is required');
        }

        // Exchange segment validation
        if (!params.exchangeSegment || !MARGIN_CONSTANTS.EXCHANGE_SEGMENTS.includes(params.exchangeSegment)) {
            errors.push(`Invalid exchangeSegment. Must be one of: ${MARGIN_CONSTANTS.EXCHANGE_SEGMENTS.join(', ')}`);
        }

        // Transaction type validation
        if (!params.transactionType || !MARGIN_CONSTANTS.TRANSACTION_TYPES.includes(params.transactionType)) {
            errors.push(`Invalid transactionType. Must be either BUY or SELL`);
        }

        // Quantity validation
        if (typeof params.quantity !== 'number' || params.quantity <= 0) {
            errors.push('Quantity must be a positive number');
        }

        // Product type validation
        if (params.productType && !MARGIN_CONSTANTS.PRODUCT_TYPES.includes(params.productType)) {
            errors.push(`Invalid productType. Must be one of: ${MARGIN_CONSTANTS.PRODUCT_TYPES.join(', ')}`);
        }

        // Security ID validation
        if (!params.securityId) {
            errors.push('securityId is required');
        }

        // Price validation
        if (typeof params.price !== 'number' || params.price <= 0) {
            errors.push('Price must be a positive number');
        }

        // Trigger price validation (optional)
        if (params.triggerPrice !== undefined && (typeof params.triggerPrice !== 'number' || params.triggerPrice < 0)) {
            errors.push('Trigger price must be a non-negative number');
        }

        // Product type compatibility checks
        if (params.productType) {
            if (['CO', 'BO'].includes(params.productType) && params.triggerPrice === undefined) {
                errors.push('Trigger price is required for CO and BO orders');
            }

            if (params.productType === 'CNC' && !params.exchangeSegment.includes('EQ')) {
                errors.push('CNC product type is only valid for equity segments');
            }
        }

        return errors;
    }

    async calculateMargin(params) {
        try {
            // Validate margin parameters
            const validationErrors = this.validateMarginParams(params);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Make API call to calculate margin
            const response = await this.api.post('/margincalculator', params);
            return response.data;

        } catch (error) {
            if (error.response) {
                throw new Error(`Margin calculation failed: ${error.response.data.message || error.response.statusText}`);
            }
            throw error;
        }
    }

    // Helper methods for common margin calculation scenarios
    async calculateEquityMargin(params) {
        return this.calculateMargin({
            ...params,
            exchangeSegment: 'NSE_EQ',
            productType: 'CNC'
        });
    }

    async calculateIntraDayMargin(params) {
        return this.calculateMargin({
            ...params,
            productType: 'INTRADAY'
        });
    }

    async calculateFNOMargin(params) {
        return this.calculateMargin({
            ...params,
            exchangeSegment: 'NSE_FNO',
            productType: 'MARGIN'
        });
    }

    async calculateCoverOrderMargin(params) {
        if (!params.triggerPrice) {
            throw new Error('Trigger price is required for Cover Orders');
        }
        return this.calculateMargin({
            ...params,
            productType: 'CO'
        });
    }

    async calculateBracketOrderMargin(params) {
        if (!params.triggerPrice) {
            throw new Error('Trigger price is required for Bracket Orders');
        }
        return this.calculateMargin({
            ...params,
            productType: 'BO'
        });
    }
}

module.exports = new MarginCalculatorService();
