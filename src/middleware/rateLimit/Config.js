// src/middleware/rateLimiter/config.js

const rateLimitConfig = {
    // Rate limits for Order APIs
    order: {
        second: { 
            limit: 100,    // Buffer for multiple requests
            cost: 25       // Cost per request
        },
        minute: { 
            limit: 1000,   // Buffer
            cost: 250      // Cost per request
        },
        hour: { 
            limit: 5000,   // Buffer
            cost: 1000     // Cost per request
        },
        day: { 
            limit: 35000,  // Buffer
            cost: 7000     // Cost per request
        }
    },
    
    // Rate limits for Data APIs
    data: {
        second: { 
            limit: 100,    // Buffer
            cost: 10       // Cost per request
        },
        minute: { 
            limit: 1000,   // Buffer
            cost: 100      // Cost per request
        },
        hour: { 
            limit: 25000,  // Buffer
            cost: 5000     // Cost per request
        },
        day: { 
            limit: 50000,  // Buffer
            cost: 10000    // Cost per request
        }
    },
    
    // Rate limits for Quote APIs (only per second limit)
    quote: {
        second: { 
            limit: 100,    // Buffer
            cost: 1        // Cost per request
        },
        minute: null,      // Unlimited
        hour: null,        // Unlimited
        day: null         // Unlimited
    },
    
    // Rate limits for Non-Trading APIs (only per second limit)
    nontrading: {
        second: { 
            limit: 100,    // Buffer
            cost: 20       // Cost per request
        },
        minute: null,      // Unlimited
        hour: null,        // Unlimited
        day: null         // Unlimited
    }
};

// Redis configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    // Add any additional Redis configuration options here
    retryStrategy: (times) => {
        if (times > 3) {
            return null;
        }
        return Math.min(times * 200, 1000);
    }
};

// Time windows in seconds
const timeWindows = {
    second: 1,
    minute: 60,
    hour: 3600,
    day: 86400
};

module.exports = {
    rateLimitConfig,
    redisConfig,
    timeWindows
};
