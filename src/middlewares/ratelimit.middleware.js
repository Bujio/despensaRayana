import { rateLimit } from 'express-rate-limit';

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
});
