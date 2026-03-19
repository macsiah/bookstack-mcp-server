import { z } from 'zod';
/**
 * Configuration schema using Zod for validation
 */
export declare const ConfigSchema: z.ZodObject<{
    bookstack: z.ZodObject<{
        baseUrl: z.ZodDefault<z.ZodString>;
        apiToken: z.ZodString;
        timeout: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        baseUrl: string;
        apiToken: string;
        timeout: number;
    }, {
        apiToken: string;
        baseUrl?: string | undefined;
        timeout?: number | undefined;
    }>;
    server: z.ZodObject<{
        name: z.ZodDefault<z.ZodString>;
        version: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        version: string;
    }, {
        name?: string | undefined;
        version?: string | undefined;
    }>;
    rateLimit: z.ZodObject<{
        requestsPerMinute: z.ZodDefault<z.ZodNumber>;
        burstLimit: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        requestsPerMinute: number;
        burstLimit: number;
    }, {
        requestsPerMinute?: number | undefined;
        burstLimit?: number | undefined;
    }>;
    validation: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        strictMode: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        strictMode: boolean;
    }, {
        enabled?: boolean | undefined;
        strictMode?: boolean | undefined;
    }>;
    logging: z.ZodObject<{
        level: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug"]>>;
        format: z.ZodDefault<z.ZodEnum<["json", "pretty"]>>;
    }, "strip", z.ZodTypeAny, {
        format: "pretty" | "json";
        level: "info" | "error" | "warn" | "debug";
    }, {
        format?: "pretty" | "json" | undefined;
        level?: "info" | "error" | "warn" | "debug" | undefined;
    }>;
    development: z.ZodObject<{
        nodeEnv: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
        debug: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        debug: boolean;
        nodeEnv: "development" | "production" | "test";
    }, {
        debug?: boolean | undefined;
        nodeEnv?: "development" | "production" | "test" | undefined;
    }>;
    tags: z.ZodDefault<z.ZodObject<{
        /**
         * Optional tag taxonomy: a map of tag name → allowed values.
         * Loaded from BOOKSTACK_TAG_TAXONOMY as a JSON string.
         * E.g. {"Status":["Draft","Complete"],"Priority":["High","Low"]}
         */
        taxonomy: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
    }, "strip", z.ZodTypeAny, {
        taxonomy?: Record<string, string[]> | undefined;
    }, {
        taxonomy?: Record<string, string[]> | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    validation: {
        enabled: boolean;
        strictMode: boolean;
    };
    bookstack: {
        baseUrl: string;
        apiToken: string;
        timeout: number;
    };
    server: {
        name: string;
        version: string;
    };
    rateLimit: {
        requestsPerMinute: number;
        burstLimit: number;
    };
    logging: {
        format: "pretty" | "json";
        level: "info" | "error" | "warn" | "debug";
    };
    development: {
        debug: boolean;
        nodeEnv: "development" | "production" | "test";
    };
    tags: {
        taxonomy?: Record<string, string[]> | undefined;
    };
}, {
    validation: {
        enabled?: boolean | undefined;
        strictMode?: boolean | undefined;
    };
    bookstack: {
        apiToken: string;
        baseUrl?: string | undefined;
        timeout?: number | undefined;
    };
    server: {
        name?: string | undefined;
        version?: string | undefined;
    };
    rateLimit: {
        requestsPerMinute?: number | undefined;
        burstLimit?: number | undefined;
    };
    logging: {
        format?: "pretty" | "json" | undefined;
        level?: "info" | "error" | "warn" | "debug" | undefined;
    };
    development: {
        debug?: boolean | undefined;
        nodeEnv?: "development" | "production" | "test" | undefined;
    };
    tags?: {
        taxonomy?: Record<string, string[]> | undefined;
    } | undefined;
}>;
export type Config = z.infer<typeof ConfigSchema>;
/**
 * Configuration manager singleton
 */
export declare class ConfigManager {
    private static instance;
    private config;
    private logger;
    private constructor();
    static getInstance(): ConfigManager;
    /**
     * Load and validate configuration from environment variables
     */
    private loadConfig;
    /**
     * Get current configuration
     */
    getConfig(): Config;
    /**
     * Reload configuration from environment
     */
    reload(): Config;
    /**
     * Validate if configuration is ready for production
     */
    validateForProduction(): void;
    /**
     * Get configuration summary for logging
     */
    getSummary(): object;
}
export default ConfigManager;
//# sourceMappingURL=manager.d.ts.map