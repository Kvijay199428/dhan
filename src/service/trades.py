const axios = require('axios');
require('dotenv').config();

// Constants for validation
const TRADE_CONSTANTS = {
    EXCHANGE_SEGMENTS: ['NSE_EQ', 'NSE_FNO', 'BSE_EQ', 'BSE_FNO', 'MCX_COMM'],
    TRANSACTION_TYPES: ['BUY', 'SELL'],
    PRODUCT_TYPES: ['CNC', 'INTRADAY', 'MARGIN', 'MTF', 'CO', 'BO'],
    ORDER_TYPES: ['LIMIT', 'MARKET', 'STOP_LOSS', 'STOP_LOSS_MARKET'],
    OPTION_TYPES: ['CALL', 'PUT', 'NA']
};

class TradesService {
    constructor() {
        this.baseURL = process.env.DHAN_API_URL || 'https://api.dhan.co/v2';
        this.accessToken = process.env.DHAN_ACCESS_TOKEN;
        
        this.api = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Accept': 'application/json',
                'access-token': this.accessToken
            }
        });
    }

    validateTradeData(trade) {
        if (!trade) return false;

        // Validate required fields
        const requiredFields = [
            'orderId', 'exchangeOrderId', 'exchangeTradeId',
            'tradingSymbol', 'securityId', 'tradedQuantity', 'tradedPrice'
        ];
        if (!requiredFields.every(field => trade[field])) return false;

        // Validate enums
        if (trade.transactionType && !TRADE_CONSTANTS.TRANSACTION_TYPES.includes(trade.transactionType)) return false;
        if (trade.exchangeSegment && !TRADE_CONSTANTS.EXCHANGE_SEGMENTS.includes(trade.exchangeSegment)) return false;
        if (trade.productType && !TRADE_CONSTANTS.PRODUCT_TYPES.includes(trade.productType)) return false;
        if (trade.orderType && !TRADE_CONSTANTS.ORDER_TYPES.includes(trade.orderType)) return false;
        if (trade.drvOptionType && !TRADE_CONSTANTS.OPTION_TYPES.includes(trade.drvOptionType)) return false;

        return true;
    }

    transformTradeData(trade) {
        return {
            orderId: trade.orderId,
            exchangeOrderId: trade.exchangeOrderId,
            exchangeTradeId: trade.exchangeTradeId,
            transactionType: trade.transactionType,
            exchangeSegment: trade.exchangeSegment,
            productType: trade.productType,
            orderType: trade.orderType,
            tradingSymbol: trade.tradingSymbol,
            customSymbol: trade.customSymbol || null,
            securityId: trade.securityId,
            tradedQuantity: parseInt(trade.tradedQuantity, 10),
            tradedPrice: parseFloat(trade.tradedPrice),
            createTime: trade.createTime ? new Date(trade.createTime) : null,
            updateTime: trade.updateTime ? new Date(trade.updateTime) : null,
            exchangeTime: trade.exchangeTime ? new Date(trade.exchangeTime) : null,
            drvExpiryDate: trade.drvExpiryDate ? new Date(trade.drvExpiryDate) : null,
            drvOptionType: trade.drvOptionType || null,
            drvStrikePrice: trade.drvStrikePrice ? parseFloat(trade.drvStrikePrice) : null
        };
    }

    async getAllTrades() {
        try {
            const response = await this.api.get('/trades');
            
            if (!Array.isArray(response.data)) {
                throw new Error('Invalid response format: Expected array of trades');
            }

            // Validate and transform each trade
            const validTrades = response.data
                .filter(trade => this.validateTradeData(trade))
                .map(trade => this.transformTradeData(trade));

            return validTrades;

        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            throw new Error(`Failed to fetch trades: ${errorMessage}`);
        }
    }

    async getTradeDetails(orderId) {
        if (!orderId) {
            throw new Error('Order ID is required');
        }

        try {
            const response = await this.api.get(`/trades/${orderId}`);
            
            if (!this.validateTradeData(response.data)) {
                throw new Error('Invalid trade data received');
            }

            return this.transformTradeData(response.data);

        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            throw new Error(`Failed to fetch trade details: ${errorMessage}`);
        }
    }
}

module.exports = new TradesService();
