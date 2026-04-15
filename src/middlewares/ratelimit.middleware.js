import { rateLimit } from 'express-rate-limit';

/**
 * Cuando NODE_ENV === 'test' devolvemos `true` para que `express-rate-limit`
 * salte el contador y no bloquee los tests, que ejecutan decenas de
 * registros/logins contra la misma IP de localhost.
 */
export const skipInTest = () => process.env.NODE_ENV === 'test';

/**
 * Rate limiter para endpoints de escritura de recursos (crear pedidos,
 * crear/editar productos, subida de imágenes...).
 *
 * Protege contra:
 *   - Creación masiva de pedidos falsos que agoten stock.
 *   - Subida masiva de imágenes a Cloudinary (coste real en €).
 *   - Escrituras ruidosas que saturen la BD.
 *
 * 30 peticiones por IP cada 15 minutos es un límite holgado para uso legítimo
 * y estricto frente a abuso.
 */
export const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    message: {
        message: 'Too many write requests, please try again later',
    },
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: skipInTest,
});
