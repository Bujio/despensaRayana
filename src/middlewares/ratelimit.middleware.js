import { rateLimit } from 'express-rate-limit';

/**
 * Cuando NODE_ENV === 'test' devolvemos `true` para que `express-rate-limit`
 * salte el contador y no bloquee los tests, que ejecutan decenas de
 * registros/logins contra la misma IP de localhost.
 */
export const skipInTest = () => process.env.NODE_ENV === 'test';

const createLimiter = ({ limit, message }) =>
    rateLimit({
        windowMs: 15 * 60 * 1000,
        limit,
        message: { message },
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        skip: skipInTest,
    });

/**
 * Rate limiter para endpoints de escritura administrativa de recursos
 * (crear/editar productos, subir imágenes, etc.).
 *
 * Se mantiene separado del checkout para que una sesión de backoffice no
 * bloquee pedidos legítimos de clientes desde la misma IP local.
 */
export const writeLimiter = createLimiter({
    limit: 30,
    message: 'Too many write requests, please try again later',
});

/**
 * Rate limiter específico para creación de pedidos.
 *
 * Tiene su propio contador independiente del backoffice: crear productos o
 * subir imágenes no consume el cupo de checkout.
 */
export const orderLimiter = createLimiter({
    limit: 30,
    message: 'Too many order requests, please try again later',
});
