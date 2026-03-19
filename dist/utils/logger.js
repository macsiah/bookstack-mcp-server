"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const winston_1 = __importDefault(require("winston"));
/**
 * Logger utility using Winston
 */
class Logger {
    constructor(winstonLogger) {
        if (winstonLogger) {
            // Used internally by child() to wrap a Winston child logger directly
            // without re-running the full setup path.
            this.logger = winstonLogger;
            return;
        }
        const level = process.env.LOG_LEVEL || 'info';
        const format = process.env.LOG_FORMAT || 'pretty';
        const logFormat = format === 'json'
            ? winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json())
            : winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                return `${timestamp} [${level}] ${message}${metaStr}`;
            }));
        this.logger = winston_1.default.createLogger({
            level,
            format: logFormat,
            transports: [
                new winston_1.default.transports.Console(),
            ],
        });
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    debug(message, meta) {
        this.logger.debug(message, meta);
    }
    info(message, meta) {
        this.logger.info(message, meta);
    }
    warn(message, meta) {
        this.logger.warn(message, meta);
    }
    error(message, meta) {
        this.logger.error(message, meta);
    }
    /**
     * Returns a child logger that inherits all settings but merges `meta` into
     * every log entry. Uses a lightweight wrapper instead of a full constructor
     * run so no second Winston instance is created.
     */
    child(meta) {
        return new Logger(this.logger.child(meta));
    }
}
exports.Logger = Logger;
exports.default = Logger;
//# sourceMappingURL=logger.js.map