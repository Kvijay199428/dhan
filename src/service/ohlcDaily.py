const axios = require('axios');
require('dotenv').config();

// Constants for validation
const CHART_CONSTANTS = {
    EXCHANGE_SEGMENTS: ['NSE_EQ', 'NSE_FNO', 'BSE_EQ', 'BSE_FNO', 'MCX_COMM', 'IDX_I'],
    INSTRUMENTS: ['INDEX', 'FUTIDX', 'OPTIDX', 'EQUITY', 'FUTSTK', 'OPTSTK', 'FUTCOM', 'OPTFUT'],
    INTERVALS: ['1', '5', '15', '25', '60'],
    // Maximum allowed date range for historical data (in days)
    MAX_HISTORICAL_DAYS: 365,
    // Instruments that require expiry code
    EXPIRY_REQUIRED_INSTRUMENTS: ['FUTIDX', 'OPTIDX', 'FUTSTK', 'OPTSTK', 'FUTCOM', 'OPTFUT']
};

class ChartDataService {
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

    validateDate(dateString) {
        // Validate date format (yyyy-MM-dd)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateString)) {
            return false;
        }

        // Check if it's a valid date
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    validateDateRange(fromDate, toDate, maxDays = CHART_CONSTANTS.MAX_HISTORICAL_DAYS) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        
        // Check if toDate is after fromDate
        if (from > to) {
            return { valid: false, message: 'fromDate must be before toDate' };
        }

        // Check if date range is within specified limits
        const daysRange = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
        if (daysRange > maxDays) {
            return { valid: false, message: `Date range cannot exceed ${maxDays} days` };
        }

        return { valid: true };
    }

    validateCommonParams(params) {
        const errors = [];

        // Security ID validation
        if (!params.securityId) {
            errors.push('securityId is required');
        }

        // Exchange segment validation
        if (!params.exchangeSegment || !CHART_CONSTANTS.EXCHANGE_SEGMENTS.includes(params.exchangeSegment)) {
            errors.push(`Invalid exchangeSegment. Must be one of: ${CHART_CONSTANTS.EXCHANGE_SEGMENTS.join(', ')}`);
        }

        // Instrument validation
        if (!params.instrument || !CHART_CONSTANTS.INSTRUMENTS.includes(params.instrument)) {
            errors.push(`Invalid instrument. Must be one of: ${CHART_CONSTANTS.INSTRUMENTS.join(', ')}`);
        }

        // Date validations
        if (!params.fromDate || !this.validateDate(params.fromDate)) {
            errors.push('Invalid fromDate format. Use yyyy-MM-dd');
        }

        if (!params.toDate || !this.validateDate(params.toDate)) {
            errors.push('Invalid toDate format. Use yyyy-MM-dd');
        }

        if (params.fromDate && params.toDate) {
            const dateRangeValidation = this.validateDateRange(params.fromDate, params.toDate);
            if (!dateRangeValidation.valid) {
                errors.push(dateRangeValidation.message);
            }
        }

        // Instrument-Exchange compatibility validation
        if (params.instrument === 'INDEX' && params.exchangeSegment !== 'IDX_I') {
            errors.push('INDEX instrument type is only valid with IDX_I exchange segment');
        }

        return errors;
    }

    validateHistoricalParams(params) {
        const errors = this.validateCommonParams(params);

        // Expiry code validation for relevant instruments
        if (CHART_CONSTANTS.EXPIRY_REQUIRED_INSTRUMENTS.includes(params.instrument)) {
            if (typeof params.expiryCode !== 'number') {
                errors.push('expiryCode is required for futures and options instruments');
            }
        }

        return errors;
    }

    validateIntradayParams(params) {
        const errors = this.validateCommonParams(params);

        // Interval validation for intraday
        if (!params.interval || !CHART_CONSTANTS.INTERVALS.includes(params.interval)) {
            errors.push(`Invalid interval. Must be one of: ${CHART_CONSTANTS.INTERVALS.join(', ')}`);
        }

        return errors;
    }

    async getHistoricalData(params) {
        try {
            // Validate historical parameters
            const validationErrors = this.validateHistoricalParams(params);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Make API call to fetch historical data
            const response = await this.api.post('/charts/historical', params);
            return response.data;

        } catch (error) {
            if (error.response) {
                throw new Error(`Failed to fetch historical data: ${error.response.data.message || error.response.statusText}`);
            }
            throw error;
        }
    }

    async getIntradayData(params) {
        try {
            // Validate intraday parameters
            const validationErrors = this.validateIntradayParams(params);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Make API call to fetch intraday data
            const response = await this.api.post('/charts/intraday', params);
            return response.data;

        } catch (error) {
            if (error.response) {
                throw new Error(`Failed to fetch intraday data: ${error.response.data.message || error.response.statusText}`);
            }
            throw error;
        }
    }

    // Helper methods for historical data
    async getEquityHistoricalData(securityId, fromDate, toDate) {
        return this.getHistoricalData({
            securityId,
            exchangeSegment: 'NSE_EQ',
            instrument: 'EQUITY',
            fromDate,
            toDate
        });
    }

    async getIndexHistoricalData(indexId, fromDate, toDate) {
        return this.getHistoricalData({
            securityId: indexId,
            exchangeSegment: 'IDX_I',
            instrument: 'INDEX',
            fromDate,
            toDate
        });
    }

    async getFuturesHistoricalData(securityId, expiryCode, fromDate, toDate) {
        return this.getHistoricalData({
            securityId,
            exchangeSegment: 'NSE_FNO',
            instrument: 'FUTSTK',
            expiryCode,
            fromDate,
            toDate
        });
    }

    async getCommodityHistoricalData(securityId, expiryCode, fromDate, toDate) {
        return this.getHistoricalData({
            securityId,
            exchangeSegment: 'MCX_COMM',
            instrument: 'FUTCOM',
            expiryCode,
            fromDate,
            toDate
        });
    }

    // Data transformation helper
    transformToOHLCV(data) {
        return data.map(item => ({
            timestamp: new Date(item.timestamp).getTime(),
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
            volume: parseInt(item.volume, 10)
        }));
    }
}

module.exports = new ChartDataService();
