// src/config/redisConfig.js

const Redis = require('redis');
require('dotenv').config();

class RedisConfig {
    constructor() {
        this.config = {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            db: process.env.REDIS_DB || 0,
            
            // Connection options
            retry_strategy: this.retryStrategy,
            connect_timeout: 10000,        // Connection timeout in ms
            max_retries: 10,              // Maximum number of retries
            enable_offline_queue: true,    // Queue commands when connection is lost
            
            // TLS options (if needed)
            tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
            
            // Performance options
            keepAlive: 30000,             // TCP Keep-alive in ms
            noDelay: true,                // Disable Nagle's algorithm
        };

        // Optional sentinel configuration
        if (process.env.REDIS_SENTINEL === 'true') {
            this.config.sentinel = {
                master: process.env.REDIS_SENTINEL_MASTER || 'mymaster',
                sentinels: this.parseSentinels(process.env.REDIS_SENTINELS)
            };
        }
    }

    // Retry strategy for connection failures
    retryStrategy(options) {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            // End reconnecting on a specific error
            return new Error('The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            // End reconnecting after 1 hour
            return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
            // End reconnecting with built in error
            return undefined;
        }
        // Reconnect after
        return Math.min(options.attempt * 100, 3000);
    }

    // Parse sentinel configuration from environment variable
    parseSentinels(sentinelString) {
        if (!sentinelString) return [];
        
        try {
            return sentinelString.split(',').map(sentinel => {
                const [host, port] = sentinel.split(':');
                return { host, port: parseInt(port) };
            });
        } catch (error) {
            console.error('Error parsing Redis sentinels:', error);
            return [];
        }
    }

    // Create and configure Redis client
    createClient() {
        const client = Redis.createClient(this.config);

        // Connection events
        client.on('connect', () => {
            console.log('Redis client connected');
        });

        client.on('ready', () => {
            console.log('Redis client ready');
        });

        client.on('error', (err) => {
            console.error('Redis client error:', err);
        });

        client.on('close', () => {
            console.log('Redis client closed connection');
        });

        client.on('reconnecting', (info) => {
            console.log('Redis client reconnecting:', info);
        });

        client.on('end', () => {
            console.log('Redis client connection ended');
        });

        return client;
    }

    // Get configuration object
    getConfig() {
        return this.config;
    }

    // Test connection
    async testConnection() {
        const client = this.createClient();
        try {
            await new Promise((resolve, reject) => {
                client.ping((err, result) => {
                    if (err) reject(err);
                    resolve(result);
                });
            });
            console.log('Redis connection test successful');
            return true;
        } catch (error) {
            console.error('Redis connection test failed:', error);
            return false;
        } finally {
            client.quit();
        }
    }

    // Helper method to format Redis connection string
    getConnectionString() {
        let connectionString = 'redis://';
        
        if (this.config.password) {
            connectionString += `:${this.config.password}@`;
        }
        
        connectionString += `${this.config.host}:${this.config.port}`;
        
        if (this.config.db) {
            connectionString += `/${this.config.db}`;
        }
        
        return connectionString;
    }
}

// Export singleton instance
const redisConfig = new RedisConfig();
module.exports = redisConfig;
