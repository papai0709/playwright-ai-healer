import winston from 'winston';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

// Ensure log directory exists
if (config.logging.toFile && config.logging.filePath) {
  const logDir = path.dirname(config.logging.filePath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

/**
 * Custom log format
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    return stack ? `${logMessage}\n${stack}` : logMessage;
  })
);

/**
 * Configure Winston logger
 */
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      customFormat
    ),
  }),
];

// Add file transport if configured
if (config.logging.toFile && config.logging.filePath) {
  transports.push(
    new winston.transports.File({
      filename: config.logging.filePath,
      format: customFormat,
    })
  );
}

/**
 * Winston logger instance
 */
export const logger = winston.createLogger({
  level: config.logging.level,
  transports,
  exceptionHandlers: transports,
  rejectionHandlers: transports,
});

/**
 * Healing-specific logger
 */
export class HealingLogger {
  static logHealingAttempt(
    selector: string,
    attempt: number,
    maxAttempts: number
  ): void {
    logger.info(
      `🔧 Healing attempt ${attempt}/${maxAttempts} for selector: ${selector}`
    );
  }

  static logHealingSuccess(
    originalSelector: string,
    healedSelector: string,
    confidence: number
  ): void {
    logger.info(
      `✅ Healing successful! Original: "${originalSelector}" → Healed: "${healedSelector}" (confidence: ${(confidence * 100).toFixed(1)}%)`
    );
  }

  static logHealingFailure(selector: string, attempts: number): void {
    logger.warn(
      `❌ Healing failed for selector: "${selector}" after ${attempts} attempts`
    );
  }

  static logSelectorUpdate(selector: string, successRate: number): void {
    logger.debug(
      `📊 Selector updated: "${selector}" (success rate: ${(successRate * 100).toFixed(1)}%)`
    );
  }
}
