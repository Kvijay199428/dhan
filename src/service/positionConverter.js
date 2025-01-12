const axios = require('axios');
require('dotenv').config();

// Validation constants
const POSITION_TYPES = {
    PRODUCT_TYPES: ['CNC', 'INTRADAY', 'MARGIN', 'MTF', 'CO', 'BO'],
    EXCHANGE_SEGMENTS: ['NSE_EQ', 'NSE_FNO', 'BSE_EQ', 'BSE_FNO', 'MCX_COMM'],
    POSITION_TYPES: ['LONG', 'SHORT', 'CLOSED']
};

class PositionConverterService {
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

    validateConversionParams(params) {
        const errors = [];

        // Required field validations
        if (!params.fromProductType || !POSITION_TYPES.PRODUCT_TYPES.includes(params.fromProductType)) {
            errors.push('Invalid or missing fromProductType');
        }

        if (!params.toProductType || !POSITION_TYPES.PRODUCT_TYPES.includes(params.toProductType)) {
            errors.push('Invalid or missing toProductType');
        }

        if (!params.exchangeSegment || !POSITION_TYPES.EXCHANGE_SEGMENTS.includes(params.exchangeSegment)) {
            errors.push('Invalid or missing exchangeSegment');
        }

        if (!params.positionType || !POSITION_TYPES.POSITION_TYPES.includes(params.positionType)) {
            errors.push('Invalid or missing positionType');
        }

        if (!params.securityId) {
            errors.push('Missing securityId');
        }

        // Quantity validation
        if (!Number.isInteger(params.convertQty) || params.convertQty <= 0) {
            errors.push('convertQty must be a positive integer');
        }

        // Product type conversion validation
        if (params.fromProductType === params.toProductType) {
            errors.push('fromProductType and toProductType cannot be the same');
        }

        // Validate specific conversion rules
        if (!this.isValidConversion(params.fromProductType, params.toProductType)) {
            errors.push('Invalid product type conversion combination');
        }

        return errors;
    }

    isValidConversion(fromType, toType) {
        // Define valid conversion paths
        const validConversions = {
            'INTRADAY': ['CNC', 'MARGIN'],
            'CNC': ['INTRADAY', 'MTF'],
            'MARGIN': ['INTRADAY'],
            'MTF': ['CNC'],
            'CO': ['INTRADAY'],
            'BO': ['INTRADAY']
        };

        return validConversions[fromType]?.includes(toType) || false;
    }

    async convertPosition(params) {
        try {
            const conversionParams = {
                dhanClientId: params.dhanClientId || this.dhanClientId,
                ...params
            };

            // Validate conversion parameters
            const validationErrors = this.validateConversionParams(conversionParams);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Make API call to convert position
            const response = await this.api.post('/positions/convert', conversionParams);
            return response.data;

        } catch (error) {
            if (error.response) {
                throw new Error(`Position conversion failed: ${error.response.data.message || error.response.statusText}`);
            }
            throw error;
        }
    }

    // Helper methods for common conversion scenarios
    async convertIntradayToCNC(params) {
        return this.convertPosition({
            ...params,
            fromProductType: 'INTRADAY',
            toProductType: 'CNC'
        });
    }

    async convertIntradayToMargin(params) {
        return this.convertPosition({
            ...params,
            fromProductType: 'INTRADAY',
            toProductType: 'MARGIN'
        });
    }

    async convertCNCToMTF(params) {
        return this.convertPosition({
            ...params,
            fromProductType: 'CNC',
            toProductType: 'MTF'
        });
    }

    async convertMTFToCNC(params) {
        return this.convertPosition({
            ...params,
            fromProductType: 'MTF',
            toProductType: 'CNC'
        });
    }

    async convertCOToIntraday(params) {
        return this.convertPosition({
            ...params,
            fromProductType: 'CO',
            toProductType: 'INTRADAY'
        });
    }

    async convertBOToIntraday(params) {
        return this.convertPosition({
            ...params,
            fromProductType: 'BO',
            toProductType: 'INTRADAY'
        });
    }
}

module.exports = new PositionConverterService();
