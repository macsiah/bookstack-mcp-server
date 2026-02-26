import winston, { Logger as WinstonLogger } from 'winston';

/**
 * Logger utility using Winston
 */
export class Logger {
  private static instance: Logger;
  private logger: WinstonLogger;

  private constructor(winstonLogger?: WinstonLogger) {
    if (winstonLogger) {
      // Used internally by child() to wrap a Winston child logger directly
      // without re-running the full setup path.
      this.logger = winstonLogger;
      return;
    }

    const level = process.env.LOG_LEVEL || 'info';
    const format = process.env.LOG_FORMAT || 'pretty';

    const logFormat = format === 'json'
      ? winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      : winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} [${level}] ${message}${metaStr}`;
          })
        );

    this.logger = winston.createLogger({
      level,
      format: logFormat,
      transports: [
        new winston.transports.Console(),
      ],
    });
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  /**
   * Returns a child logger that inherits all settings but merges `meta` into
   * every log entry. Uses a lightweight wrapper instead of a full constructor
   * run so no second Winston instance is created.
   */
  child(meta: any): Logger {
    return new Logger(this.logger.child(meta));
  }
}

export default Logger;