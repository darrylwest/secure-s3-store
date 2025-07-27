// src/logger.ts
import winston from 'winston';
import 'winston-daily-rotate-file';
import fs from 'fs';
import path from 'path';

export interface LoggerConfig {
  consoleLogLevel?: string;
  fileLogLevel?: string;
  logDir?: string;
}

export function configureLogger(config: LoggerConfig = {}): winston.Logger {
  const {
    consoleLogLevel = 'error',
    fileLogLevel = 'info',
    logDir = 'logs',
  } = config;

  // Create the log directory if it does not exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  const dailyRotateFileTransport = new winston.transports.DailyRotateFile({
    level: fileLogLevel,
    filename: path.join(logDir, 'salt-pipe-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  });

  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    ),
    transports: [
      new winston.transports.Console({
        level: consoleLogLevel,
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
      dailyRotateFileTransport,
    ],
  });

  return logger;
}

export default configureLogger();
