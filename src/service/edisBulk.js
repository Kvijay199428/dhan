const axios = require('axios');
require('dotenv').config();

// Validation constants
const BULK_EDIS_CONSTANTS = {
    EXCHANGES: ['NSE', 'BSE', 'MCX', 'ALL'],
    SEGMENTS: ['EQ', 'COMM', 'FNO']
};

class BulkEDISService {
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

    validateISIN(isin) {
        // ISIN format validation
        return typeof isin === 'string' && /^[A-Z]{2}[0-9A-Z]{10}$/.test(isin);
    }

    validateBulkEDISParams(params) {
        const errors = [];

        // ISIN array validation
        if (!Array.isArray(params.isin) || params.isin.length === 0) {
            errors.push('ISIN must be a non-empty array of strings');
        } else {
            // Validate each ISIN in the array
            const invalidISINs = params.isin.filter(isin => !this.validateISIN(isin));
            if (invalidISINs.length > 0) {
                errors.push(`Invalid ISIN format for: ${invalidISINs.join(', ')}`);
            }
        }

        // Exchange validation
        if (!params.exchange || !BULK_EDIS_CONSTANTS.EXCHANGES.includes(params.exchange)) {
            errors.push('Invalid or missing exchange. Must be NSE, BSE, MCX, or ALL');
        }

        // Segment validation
        if (!params.segment || !BULK_EDIS_CONSTANTS.SEGMENTS.includes(params.segment)) {
            errors.push('Invalid or missing segment. Must be EQ, COMM, or FNO');
        }

        // Validate exchange-segment compatibility
        if (!this.isValidExchangeSegmentCombination(params.exchange, params.segment)) {
            errors.push('Invalid exchange and segment combination');
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

    async generateBulkEDISForm(params) {
        try {
            // Validate bulk EDIS parameters
            const validationErrors = this.validateBulkEDISParams(params);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Make API call to generate bulk EDIS form
            const response = await this.api.post('/edis/bulkform', params);
            return response.data;

        } catch (error) {
            if (error.response) {
                throw new Error(`Bulk EDIS form generation failed: ${error.response.data.message || error.response.statusText}`);
            }
            throw error;
        }
    }

    // Helper methods for common bulk EDIS form generation scenarios
    async generateBulkEquityEDISForm(isins, exchange = 'NSE') {
        return this.generateBulkEDISForm({
            isin: isins,
            exchange: exchange,
            segment: 'EQ'
        });
    }

    async generateBulkFNOEDISForm(isins, exchange = 'NSE') {
        return this.generateBulkEDISForm({
            isin: isins,
            exchange: exchange,
            segment: 'FNO'
        });
    }

    async generateBulkCommodityEDISForm(isins) {
        return this.generateBulkEDISForm({
            isin: isins,
            exchange: 'MCX',
            segment: 'COMM'
        });
    }

    async generateMultiExchangeEDISForm(isins, segment = 'EQ') {
        return this.generateBulkEDISForm({
            isin: isins,
            exchange: 'ALL',
            segment: segment
        });
    }
}

module.exports = new BulkEDISService();
