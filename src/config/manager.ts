import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';
import { Logger } from '../utils/logger';

// Load environment variables
dotenvConfig();

/**
 * Configuration schema using Zod for validation
 */
export const ConfigSchema = z.object({
  bookstack: z.object({
    baseUrl: z.string().url('Invalid BookStack base URL').default('http://localhost:8080/api'),
    apiToken: z.string().min(1, 'BookStack API token is required - set BOOKSTACK_API_TOKEN environment variable'),
    timeout: z.number().positive().default(30000),
  }),
  server: z.object({
    name: z.string().default('bookstack-mcp-server'),
    version: z.string().default('1.0.0'),
    // Note: this server uses stdio transport and does not bind to a port.
    // SERVER_PORT is intentionally not loaded.
  }),
  rateLimit: z.object({
    requestsPerMinute: z.number().positive().default(60),
    burstLimit: z.number().positive().default(10),
  }),
  validation: z.object({
    enabled: z.boolean().default(true),
    strictMode: z.boolean().default(false),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    format: z.enum(['json', 'pretty']).default('pretty'),
  }),
  development: z.object({
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    debug: z.boolean().default(false),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Configuration manager singleton
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: Config;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load and validate configuration from environment variables
   */
  private loadConfig(): Config {
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
    };

    try {
      const validatedConfig = ConfigSchema.parse(rawConfig);
      this.logger.info('Configuration loaded and validated successfully');
      return validatedConfig;
    } catch (error) {
      if (error instanceof z.ZodError) {
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
  getConfig(): Config {
    return this.config;
  }

  /**
   * Reload configuration from environment
   */
  reload(): Config {
    this.config = this.loadConfig();
    return this.config;
  }

  /**
   * Validate if configuration is ready for production
   */
  validateForProduction(): void {
    const config = this.getConfig();
    const errors: string[] = [];

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
  getSummary(): object {
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

export default ConfigManager;