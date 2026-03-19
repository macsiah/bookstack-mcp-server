/**
 * Logger utility using Winston
 */
export declare class Logger {
    private static instance;
    private logger;
    private constructor();
    static getInstance(): Logger;
    debug(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    /**
     * Returns a child logger that inherits all settings but merges `meta` into
     * every log entry. Uses a lightweight wrapper instead of a full constructor
     * run so no second Winston instance is created.
     */
    child(meta: any): Logger;
}
export default Logger;
//# sourceMappingURL=logger.d.ts.map