/**
 * Logger centralizado de la aplicación.
 *
 * Envuelve console.* con un prefijo de nivel y timestamp ISO, y silencia los
 * logs `debug` fuera de desarrollo. Centralizarlo aquí permite cambiar en el
 * futuro a pino/winston sin tocar el resto del código.
 *
 * Uso:
 *   import { logger } from '../utils/logger.js';
 *   logger.info('Server started on port 3000');
 *   logger.error('DB connection failed', err);
 */
const isProd = process.env.NODE_ENV === 'production';

const format = (level, args) => {
    const timestamp = new Date().toISOString();
    return [`[${timestamp}] [${level}]`, ...args];
};

/* eslint-disable no-console */
export const logger = {
    info: (...args) => console.log(...format('INFO', args)),
    warn: (...args) => console.warn(...format('WARN', args)),
    error: (...args) => console.error(...format('ERROR', args)),
    // Debug solo aparece fuera de producción para no llenar los logs reales
    debug: (...args) => {
        if (!isProd) console.log(...format('DEBUG', args));
    },
};
