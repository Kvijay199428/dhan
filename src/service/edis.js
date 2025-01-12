const axios = require('axios');
require('dotenv').config();

// Validation constants
const EDIS_CONSTANTS = {
    EXCHANGES: ['NSE', 'BSE', 'MCX', 'ALL'],
    SEGMENTS: ['EQ', 'COMM', 'FNO']
};

class EDISService {
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

    validateEDISParams(params) {
        const errors = [];

        // ISIN validation
        if (!params.isin || typeof params.isin !== 'string') {
            errors.push('Invalid or missing ISIN');
        } else if (!/^[A-Z]{2}[0-9A-Z]{10}$/.test(params.isin)) {
            errors.push('ISIN must be 12 characters long and follow the correct format');
        }

        // Quantity validation
        if (!Number.isInteger(params.qty) || params.qty < 1) {
            errors.push('Quantity must be a positive integer');
        }

        // Exchange validation
        if (!params.exchange || !EDIS_CONSTANTS.EXCHANGES.includes(params.exchange)) {
            errors.push('Invalid or missing exchange. Must be NSE, BSE, MCX, or ALL');
        }

        // Segment validation
        if (!params.segment || !EDIS_CONSTANTS.SEGMENTS.includes(params.segment)) {
            errors.push('Invalid or missing segment. Must be EQ, COMM, or FNO');
        }

        // Validate exchange-segment compatibility
        if (!this.isValidExchangeSegmentCombination(params.exchange, params.segment)) {
            errors.push('Invalid exchange and segment combination');
        }

        // Bulk flag validation (optional)
        if (params.bulk !== undefined && typeof params.bulk !== 'boolean') {
            errors.push('Bulk flag must be a boolean value');
        }

        return errors;
    }

    isValidExchangeSegmentCombination(exchange, segment) {
        const validCombinations = {
            'NSE': ['EQ', 'FNO'],
            'BSE': ['EQ', 'FNO'],
            'MCX': ['COMM'],
            'ALL': ['EQ', 'COMM', 'FNO']
        };

        return validCombinations[exchange]?.includes(segment) || false;
    }

    async generateEDISForm(params) {
        try {
            // Validate EDIS parameters
            const validationErrors = this.validateEDISParams(params);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Make API call to generate EDIS form
            const response = await this.api.post('/edis/form', params);
            return response.data;

        } catch (error) {
            if (error.response) {
                throw new Error(`EDIS form generation failed: ${error.response.data.message || error.response.statusText}`);
            }
            throw error;
        }
    }

    // Helper methods for common EDIS form generation scenarios
    async generateEquityEDISForm(params) {
        return this.generateEDISForm({
            ...params,
            segment: 'EQ',
            exchange: params.exchange || 'NSE',
            bulk: params.bulk !== undefined ? params.bulk : false
        });
    }

    async generateBulkEquityEDISForm(params) {
        return this.generateEDISForm({
            ...params,
            segment: 'EQ',
            exchange: 'ALL',
            bulk: true
        });
    }

    async generateFNOEDISForm(params) {
        return this.generateEDISForm({
            ...params,
            segment: 'FNO',
            exchange: params.exchange || 'NSE',
            bulk: params.bulk !== undefined ? params.bulk : false
        });
    }

    async generateCommodityEDISForm(params) {
        return this.generateEDISForm({
            ...params,
            segment: 'COMM',
            exchange: 'MCX',
            bulk: params.bulk !== undefined ? params.bulk : false
        });
    }
}

module.exports = new EDISService();
