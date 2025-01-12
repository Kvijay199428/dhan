const axios = require('axios');
require('dotenv').config();

// Constants for validation
const CHART_CONSTANTS = {
    EXCHANGE_SEGMENTS: ['NSE_EQ', 'NSE_FNO', 'BSE_EQ', 'BSE_FNO', 'MCX_COMM', 'IDX_I'],
    INSTRUMENTS: ['INDEX', 'FUTIDX', 'OPTIDX', 'EQUITY', 'FUTSTK', 'OPTSTK', 'FUTCOM', 'OPTFUT'],
    INTERVALS: ['1', '5', '15', '25', '60']
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

    validateDateRange(fromDate, toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        
        // Check if toDate is after fromDate
        if (from > to) {
            return false;
        }

        // Check if date range is within reasonable limits (e.g., 1 year)
        const yearInMs = 365 * 24 * 60 * 60 * 1000;
        return (to - from) <= yearInMs;
    }

    validateChartParams(params) {
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

        // Interval validation
        if (!params.interval || !CHART_CONSTANTS.INTERVALS.includes(params.interval)) {
            errors.push(`Invalid interval. Must be one of: ${CHART_CONSTANTS.INTERVALS.join(', ')}`);
        }

        // Date validations
        if (!params.fromDate || !this.validateDate(params.fromDate)) {
            errors.push('Invalid fromDate format. Use yyyy-MM-dd');
        }

        if (!params.toDate || !this.validateDate(params.toDate)) {
            errors.push('Invalid toDate format. Use yyyy-MM-dd');
        }

        if (params.fromDate && params.toDate && !this.validateDateRange(params.fromDate, params.toDate)) {
            errors.push('Invalid date range. Ensure fromDate is before toDate and within 1 year');
        }

        // Instrument-Exchange compatibility validation
        if (params.instrument === 'INDEX' && params.exchangeSegment !== 'IDX_I') {
            errors.push('INDEX instrument type is only valid with IDX_I exchange segment');
        }

        return errors;
    }

    async getIntradayData(params) {
        try {
            // Validate chart parameters
            const validationErrors = this.validateChartParams(params);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Make API call to fetch intraday data
            const response = await this.api.post('/charts/intraday', params);
            return response.data;

        } catch (error) {
            if (error.response) {
                throw new Error(`Failed to fetch chart data: ${error.response.data.message || error.response.statusText}`);
            }
            throw error;
        }
    }

    // Helper methods for common chart data scenarios
    async getEquityIntradayData(securityId, interval = '5', fromDate, toDate) {
        return this.getIntradayData({
            securityId,
            exchangeSegment: 'NSE_EQ',
            instrument: 'EQUITY',
            interval,
            fromDate,
            toDate
        });
    }

    async getIndexIntradayData(indexId, interval = '5', fromDate, toDate) {
        return this.getIntradayData({
            securityId: indexId,
            exchangeSegment: 'IDX_I',
            instrument: 'INDEX',
            interval,
            fromDate,
            toDate
        });
    }

    async getFuturesIntradayData(securityId, interval = '5', fromDate, toDate) {
        return this.getIntradayData({
            securityId,
            exchangeSegment: 'NSE_FNO',
            instrument: 'FUTSTK',
            interval,
            fromDate,
            toDate
        });
    }

    async getCommodityIntradayData(securityId, interval = '5', fromDate, toDate) {
        return this.getIntradayData({
            securityId,
            exchangeSegment: 'MCX_COMM',
            instrument: 'FUTCOM',
            interval,
            fromDate,
            toDate
        });
    }
}

module.exports = new ChartDataService();
