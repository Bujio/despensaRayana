import { HttpError } from './http-error.js';

/**
 * Asegura que el usuario autenticado es admin o el propietario del recurso.
 * Lanza HttpError(403) si no, de modo que cae en el handler global de Express
 * y los controllers no tienen que mezclar lógica de respuesta HTTP con la
 * de negocio.
 *
 * Uso en un controller:
 *   assertOwnerOrAdmin(req, req.user.id === req.params.id);
 *
 * @param {import('express').Request} req - Debe tener req.user poblado por authMiddleware
 * @param {boolean} isOwner - Resultado de la comparación propietario/recurso
 * @throws {HttpError} 403 si no es admin ni propietario
 */
export const assertOwnerOrAdmin = (req, isOwner) => {
    if (req.user?.role === 'admin' || isOwner) return;
    throw new HttpError('Forbidden: insufficient permissions', 403);
};
