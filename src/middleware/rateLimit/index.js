// src/middleware/rateLimiter/index.js

const TieredRateLimiter = require('./ApiRateLimiter');
const { rateLimitConfig, redisConfig, timeWindows } = require('./config');

class RateLimiterService {
    constructor() {
        this.rateLimiter = null;
    }

    initialize() {
        if (!this.rateLimiter) {
            try {
                this.rateLimiter = new TieredRateLimiter(
                    rateLimitConfig,
                    redisConfig,
                    timeWindows
                );
                console.log('Rate limiter initialized successfully');
            } catch (error) {
                console.error('Failed to initialize rate limiter:', error);
                throw error;
            }
        }
        return this.rateLimiter;
    }

    getInstance() {
        if (!this.rateLimiter) {
            return this.initialize();
        }
        return this.rateLimiter;
    }

    // Convenience methods for different API types
    orderApiLimiter() {
        return this.getInstance().middleware('order');
    }

    dataApiLimiter() {
        return this.getInstance().middleware('data');
    }

    quoteApiLimiter() {
        return this.getInstance().middleware('quote');
    }

    nonTradingApiLimiter() {
        return this.getInstance().middleware('nontrading');
    }
}

// Create and export a singleton instance
const rateLimiterService = new RateLimiterService();
module.exports = rateLimiterService;
