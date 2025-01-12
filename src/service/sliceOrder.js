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

class SliceOrderService {
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

    validateSliceOrderParams(params) {
        const errors = [];

        // Required field validations
        if (!params.transactionType || !ORDER_TYPES.TRANSACTION_TYPES.includes(params.transactionType)) {
            errors.push('Invalid or missing transactionType. Must be BUY or SELL');
        }

        if (!params.exchangeSegment || !ORDER_TYPES.EXCHANGE_SEGMENTS.includes(params.exchangeSegment)) {
            errors.push('Invalid or missing exchangeSegment');
        }

        if (!params.productType || !ORDER_TYPES.PRODUCT_TYPES.includes(params.productType)) {
            errors.push('Invalid or missing productType');
        }

        if (!params.orderType || !ORDER_TYPES.ORDER_TYPES.includes(params.orderType)) {
            errors.push('Invalid or missing orderType');
        }

        if (!params.validity || !ORDER_TYPES.VALIDITY_TYPES.includes(params.validity)) {
            errors.push('Invalid or missing validity');
        }

        if (!params.securityId) {
            errors.push('Missing securityId');
        }

        // Numeric validations
        if (!Number.isInteger(params.quantity)) {
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

        // AMO validations
        if (params.afterMarketOrder && params.amoTime && !ORDER_TYPES.AMO_TIMES.includes(params.amoTime)) {
            errors.push('Invalid amoTime');
        }

        // BO validations
        if (params.productType === 'BO') {
            if (typeof params.boProfitValue !== 'number') {
                errors.push('boProfitValue must be a number for BO orders');
            }
            if (typeof params.boStopLossValue !== 'number') {
                errors.push('boStopLossValue must be a number for BO orders');
            }
        }

        return errors;
    }

    async placeSliceOrder(orderParams) {
        try {
            // Generate correlation ID if not provided
            const correlationId = orderParams.correlationId || `SLICE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const params = {
                dhanClientId: orderParams.dhanClientId || this.dhanClientId,
                correlationId,
                ...orderParams
            };

            // Validate order parameters
            const validationErrors = this.validateSliceOrderParams(params);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Make API call to place slice order
            const response = await this.api.post('/orders/slicing', params);
            return response.data;

        } catch (error) {
            if (error.response) {
                throw new Error(`Slice order placement failed: ${error.response.data.message || error.response.statusText}`);
            }
            throw error;
        }
    }

    // Helper methods for common slice order types
    async placeLimitSliceOrder(params) {
        return this.placeSliceOrder({
            ...params,
            orderType: 'LIMIT',
            validity: 'DAY'
        });
    }

    async placeMarketSliceOrder(params) {
        return this.placeSliceOrder({
            ...params,
            orderType: 'MARKET',
            validity: 'DAY'
        });
    }

    async placeAMOSliceOrder(params) {
        return this.placeSliceOrder({
            ...params,
            afterMarketOrder: true,
            amoTime: params.amoTime || 'OPEN'
        });
    }

    async placeBracketSliceOrder(params) {
        return this.placeSliceOrder({
            ...params,
            productType: 'BO',
            validity: 'DAY',
            boProfitValue: params.boProfitValue,
            boStopLossValue: params.boStopLossValue
        });
    }
}

module.exports = new SliceOrderService();
