import { createLogger, format, transports } from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// Ensure logs folder exists
const logDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Generate timestamp for unique log file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFileName = `execution-${timestamp}.log`;

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(info => `[${info.timestamp}] [${info.level.toUpperCase()}] ${info.message}`)
  ),
  transports: [
    new transports.Console({ format: format.combine(format.colorize(), format.simple()) }),
    new transports.File({ filename: path.join(logDir, logFileName) })
  ]
});

export default logger;
