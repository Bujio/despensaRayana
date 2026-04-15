/**
 * Helper para lanzar errores HTTP con código de estado asociado.
 *
 * Centraliza el patrón `Object.assign(new Error(msg), { status })` que se
 * repite en los services. Al ser una subclase de Error se comporta igual
 * en los try/catch y en el handler global de app.js (que ya lee err.status).
 *
 * Uso:
 *   throw new HttpError('Product not found', 404);
 */
export class HttpError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
    }
}
