import winston from 'winston';
import 'winston-daily-rotate-file';
export interface LoggerConfig {
    consoleLogLevel?: string;
    fileLogLevel?: string;
    logDir?: string;
}
export declare function configureLogger(config?: LoggerConfig): winston.Logger;
declare const _default: winston.Logger;
export default _default;
