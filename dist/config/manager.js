"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = exports.ConfigSchema = void 0;
const zod_1 = require("zod");
const dotenv_1 = require("dotenv");
const logger_1 = require("../utils/logger");
// Load environment variables
(0, dotenv_1.config)();
/**
 * Configuration schema using Zod for validation
 */
exports.ConfigSchema = zod_1.z.object({
    bookstack: zod_1.z.object({
        baseUrl: zod_1.z.string().url('Invalid BookStack base URL').default('http://localhost:8080/api'),
        apiToken: zod_1.z.string().min(1, 'BookStack API token is required - set BOOKSTACK_API_TOKEN environment variable'),
        timeout: zod_1.z.number().positive().default(30000),
    }),
    server: zod_1.z.object({
        name: zod_1.z.string().default('bookstack-mcp-server'),
        version: zod_1.z.string().default('1.0.0'),
        // Note: this server uses stdio transport and does not bind to a port.
        // SERVER_PORT is intentionally not loaded.
    }),
    rateLimit: zod_1.z.object({
        requestsPerMinute: zod_1.z.number().positive().default(60),
        burstLimit: zod_1.z.number().positive().default(10),
    }),
    validation: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        strictMode: zod_1.z.boolean().default(false),
    }),
    logging: zod_1.z.object({
        level: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
        format: zod_1.z.enum(['json', 'pretty']).default('pretty'),
    }),
    development: zod_1.z.object({
        nodeEnv: zod_1.z.enum(['development', 'production', 'test']).default('development'),
        debug: zod_1.z.boolean().default(false),
    }),
    tags: zod_1.z.object({
        /**
         * Optional tag taxonomy: a map of tag name → allowed values.
         * Loaded from BOOKSTACK_TAG_TAXONOMY as a JSON string.
         * E.g. {"Status":["Draft","Complete"],"Priority":["High","Low"]}
         */
        taxonomy: zod_1.z.record(zod_1.z.array(zod_1.z.string())).optional(),
    }).default({}),
});
/**
 * Configuration manager singleton
 */
class ConfigManager {
    constructor() {
        this.logger = logger_1.Logger.getInstance();
        this.config = this.loadConfig();
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    /**
     * Load and validate configuration from environment variables
     */
    loadConfig() {
        const rawConfig = {
            bookstack: {
                baseUrl: process.env.BOOKSTACK_BASE_URL || 'http://localhost:8080/api',
                apiToken: process.env.BOOKSTACK_API_TOKEN || '',
                timeout: parseInt(process.env.BOOKSTACK_TIMEOUT || '30000'),
            },
            server: {
                name: process.env.SERVER_NAME || 'bookstack-mcp-server',
                version: process.env.SERVER_VERSION || '1.0.0',
            },
            rateLimit: {
                requestsPerMinute: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60'),
                burstLimit: parseInt(process.env.RATE_LIMIT_BURST_LIMIT || '10'),
            },
            validation: {
                enabled: process.env.VALIDATION_ENABLED !== 'false',
                strictMode: process.env.VALIDATION_STRICT_MODE === 'true',
            },
            logging: {
                level: process.env.LOG_LEVEL || 'info',
                format: process.env.LOG_FORMAT || 'pretty',
            },
            development: {
                nodeEnv: process.env.NODE_ENV || 'development',
                debug: process.env.DEBUG === 'true',
            },
            tags: {
                taxonomy: process.env.BOOKSTACK_TAG_TAXONOMY
                    ? (() => {
                        try {
                            return JSON.parse(process.env.BOOKSTACK_TAG_TAXONOMY);
                        }
                        catch {
                            this.logger.warn('BOOKSTACK_TAG_TAXONOMY is not valid JSON — ignoring');
                            return undefined;
                        }
                    })()
                    : undefined,
            },
        };
        try {
            const validatedConfig = exports.ConfigSchema.parse(rawConfig);
            this.logger.info('Configuration loaded and validated successfully');
            return validatedConfig;
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
                this.logger.error('Configuration validation failed:', errorMessages);
                throw new Error(`Configuration validation failed: ${errorMessages.join(', ')}`);
            }
            throw error;
        }
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Reload configuration from environment
     */
    reload() {
        this.config = this.loadConfig();
        return this.config;
    }
    /**
     * Validate if configuration is ready for production
     */
    validateForProduction() {
        const config = this.getConfig();
        const errors = [];
        // Check required production settings
        if (!config.bookstack.apiToken) {
            errors.push('BOOKSTACK_API_TOKEN is required');
        }
        if (config.bookstack.baseUrl.includes('localhost') && config.development.nodeEnv === 'production') {
            errors.push('Production should not use localhost for BookStack URL');
        }
        if (config.development.debug && config.development.nodeEnv === 'production') {
            errors.push('Debug mode should be disabled in production');
        }
        if (config.logging.level === 'debug' && config.development.nodeEnv === 'production') {
            errors.push('Debug logging should be disabled in production');
        }
        if (errors.length > 0) {
            throw new Error(`Production validation failed: ${errors.join(', ')}`);
        }
        this.logger.info('Configuration validated for production');
    }
    /**
     * Get configuration summary for logging
     */
    getSummary() {
        const config = this.getConfig();
        return {
            bookstack: {
                baseUrl: config.bookstack.baseUrl,
                hasApiToken: !!config.bookstack.apiToken,
                timeout: config.bookstack.timeout,
            },
            server: config.server,
            rateLimit: config.rateLimit,
            validation: config.validation,
            logging: config.logging,
            development: config.development,
        };
    }
}
exports.ConfigManager = ConfigManager;
exports.default = ConfigManager;
//# sourceMappingURL=manager.js.map