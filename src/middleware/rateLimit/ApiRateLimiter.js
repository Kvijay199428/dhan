const Redis = require('redis');
const util = require('util');

class TieredRateLimiter {
    constructor() {
        this.redisClient = Redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379
        });

        // Promisify Redis methods
        this.getAsync = util.promisify(this.redisClient.get).bind(this.redisClient);
        this.setAsync = util.promisify(this.redisClient.set).bind(this.redisClient);
        this.expireAsync = util.promisify(this.redisClient.expire).bind(this.redisClient);
        this.incrByAsync = util.promisify(this.redisClient.incrby).bind(this.redisClient);

        // Define rate limits for different time windows
        this.rateLimits = {
            'order': {
                second: { limit: 100, cost: 25 },    // 25 per request, buffer of 100
                minute: { limit: 1000, cost: 250 },  // 250 per request, buffer of 1000
                hour: { limit: 5000, cost: 1000 },   // 1000 per request, buffer of 5000
                day: { limit: 35000, cost: 7000 }    // 7000 per request, buffer of 35000
            },
            'data': {
                second: { limit: 100, cost: 10 },    // 10 per request, buffer of 100
                minute: { limit: 1000, cost: 100 },  // 100 per request, buffer of 1000
                hour: { limit: 25000, cost: 5000 },  // 5000 per request, buffer of 25000
                day: { limit: 50000, cost: 10000 }   // 10000 per request, buffer of 50000
            },
            'quote': {
                second: { limit: 100, cost: 1 },     // 1 per request, buffer of 100
                minute: null,                        // Unlimited
                hour: null,                          // Unlimited
                day: null                            // Unlimited
            },
            'nontrading': {
                second: { limit: 100, cost: 20 },    // 20 per request, buffer of 100
                minute: null,                        // Unlimited
                hour: null,                          // Unlimited
                day: null                            // Unlimited
            }
        };

        // Time windows in seconds
        this.timeWindows = {
            second: 1,
            minute: 60,
            hour: 3600,
            day: 86400
        };
    }

    async checkRateLimit(ip, category) {
        try {
            const limits = this.rateLimits[category];
            if (!limits) {
                throw new Error(`Unknown API category: ${category}`);
            }

            // Check each time window
            for (const [window, duration] of Object.entries(this.timeWindows)) {
                if (!limits[window]) continue; // Skip unlimited windows

                const key = `ratelimit:${ip}:${category}:${window}`;
                const currentTime = Math.floor(Date.now() / 1000);
                const windowStart = currentTime - (currentTime % duration);
                const cost = limits[window].cost;
                const limit = limits[window].limit;

                // Get or create window counter
                let count = await this.getAsync(key);
                if (!count) {
                    count = 0;
                    await this.setAsync(key, 0);
                    await this.expireAsync(key, duration);
                }

                count = parseInt(count);

                // Check if adding this request would exceed the limit
                if (count + cost > limit) {
                    return {
                        allowed: false,
                        category,
                        window,
                        costPerRequest: cost,
                        remaining: 0,
                        resetTime: windowStart + duration - currentTime,
                        message: `Rate limit exceeded for ${window}. Each ${category} request costs ${cost} points, and you have used ${count} out of ${limit} points this ${window}.`
                    };
                }
            }

            // If we get here, we haven't exceeded any limits
            // Increment all counters
            const updates = [];
            for (const [window, duration] of Object.entries(this.timeWindows)) {
                if (!limits[window]) continue;

                const key = `ratelimit:${ip}:${category}:${window}`;
                const cost = limits[window].cost;
                updates.push(this.incrByAsync(key, cost));
            }

            await Promise.all(updates);

            // Calculate remaining requests for each window
            const remaining = {};
            for (const [window, duration] of Object.entries(this.timeWindows)) {
                if (!limits[window]) {
                    remaining[window] = 'unlimited';
                    continue;
                }

                const key = `ratelimit:${ip}:${category}:${window}`;
                const count = await this.getAsync(key);
                const limit = limits[window].limit;
                const cost = limits[window].cost;
                remaining[window] = Math.floor((limit - count) / cost);
            }

            return {
                allowed: true,
                category,
                remaining,
                costs: Object.entries(limits).reduce((acc, [window, config]) => {
                    if (config) acc[window] = config.cost;
                    return acc;
                }, {})
            };

        } catch (error) {
            console.error('Rate limiter error:', error);
            return { allowed: true, remaining: -1, error: error.message };
        }
    }

    // Express middleware
    middleware(category) {
        return async (req, res, next) => {
            const ip = req.ip || req.connection.remoteAddress;
            const result = await this.checkRateLimit(ip, category);

            if (result.allowed) {
                // Set rate limit headers
                res.setHeader('X-RateLimit-Category', category);
                res.setHeader('X-RateLimit-Costs', JSON.stringify(result.costs));
                res.setHeader('X-RateLimit-Remaining', JSON.stringify(result.remaining));
                next();
            } else {
                return res.status(429).json({
                    error: 'Too Many Requests',
                    message: result.message,
                    category: result.category,
                    window: result.window,
                    costPerRequest: result.costPerRequest,
                    resetTime: result.resetTime
                });
            }
        };
    }
}

module.exports = TieredRateLimiter;
