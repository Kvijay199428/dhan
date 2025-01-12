const axios = require('axios');
require('dotenv').config();

class KillswitchService {
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

        // Status tracking
        this._killswitchStatus = null;
        this._lastStatusCheck = null;
        this._statusCheckInterval = 60000; // 1 minute in milliseconds
    }

    validateAccessToken() {
        if (!this.accessToken) {
            throw new Error('Access token is required for killswitch operations');
        }
    }

    async activateKillswitch() {
        try {
            this.validateAccessToken();

            const response = await this.api.post('/killswitch');
            this._killswitchStatus = 'ACTIVE';
            this._lastStatusCheck = Date.now();
            
            return {
                status: 'success',
                message: 'Killswitch activated successfully',
                timestamp: new Date().toISOString(),
                details: response.data
            };

        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            throw new Error(`Failed to activate killswitch: ${errorMessage}`);
        }
    }

    async getKillswitchStatus() {
        try {
            this.validateAccessToken();

            // Check if we have a recent status check
            const now = Date.now();
            if (this._killswitchStatus && this._lastStatusCheck && 
                (now - this._lastStatusCheck < this._statusCheckInterval)) {
                return {
                    status: this._killswitchStatus,
                    lastChecked: new Date(this._lastStatusCheck).toISOString(),
                    cached: true
                };
            }

            // Make API call to get current status
            const response = await this.api.get('/killswitch');
            
            this._killswitchStatus = response.data.killSwitchStatus;
            this._lastStatusCheck = now;

            return {
                status: this._killswitchStatus,
                lastChecked: new Date(now).toISOString(),
                cached: false,
                details: response.data
            };

        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            throw new Error(`Failed to get killswitch status: ${errorMessage}`);
        }
    }

    async monitorKillswitch(callback, interval = 60000) {
        let monitoring = true;
        
        const monitor = async () => {
            try {
                while (monitoring) {
                    const status = await this.getKillswitchStatus();
                    callback(null, status);
                    await new Promise(resolve => setTimeout(resolve, interval));
                }
            } catch (error) {
                callback(error);
                monitoring = false;
            }
        };

        monitor();

        return {
            stop: () => {
                monitoring = false;
            }
        };
    }

    setStatusCheckInterval(interval) {
        if (typeof interval !== 'number' || interval < 1000) {
            throw new Error('Status check interval must be a number greater than 1000ms');
        }
        this._statusCheckInterval = interval;
    }

    clearStatusCache() {
        this._killswitchStatus = null;
        this._lastStatusCheck = null;
    }
}

module.exports = new KillswitchService();
