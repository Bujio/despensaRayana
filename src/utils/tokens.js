import crypto from 'node:crypto';

/**
 * Helpers de tokens criptográficos para refresh tokens y verificación de email.
 *
 * Usamos `crypto.randomBytes` (CSPRNG del sistema) para generar los valores
 * planos y `crypto.createHash('sha256')` para almacenar solo el hash en BD.
 * El plano se envía al cliente y solo el cliente lo conoce.
 */

/**
 * Genera un token aleatorio base64url-seguro para URLs y headers.
 * @param {number} bytes Cantidad de bytes de entropía (48 ≈ 64 chars base64url)
 */
export const generateRandomToken = (bytes = 48) =>
    crypto.randomBytes(bytes).toString('base64url');

/**
 * Hashea un token plano con SHA-256 en hex.
 * Determinista: la misma entrada siempre produce la misma salida, por lo que
 * podemos buscar por hash en BD sin perder la propiedad de seguridad.
 */
export const hashToken = (token) =>
    crypto.createHash('sha256').update(token).digest('hex');
