/**
 * Logger interface. Consumers provide their own implementation
 * (console, pino, winston, etc.). Falls back to no-op if not provided.
 */
export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

/**
 * No-op logger used when no logger is provided.
 */
export const noopLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

/**
 * Simple console logger for development / examples.
 */
export const consoleLogger: Logger = {
  debug(message, data) {
    console.debug(`[DEBUG] ${message}`, data ?? '');
  },
  info(message, data) {
    console.info(`[INFO] ${message}`, data ?? '');
  },
  warn(message, data) {
    console.warn(`[WARN] ${message}`, data ?? '');
  },
  error(message, data) {
    console.error(`[ERROR] ${message}`, data ?? '');
  },
};
