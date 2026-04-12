/**
 * Middleware de autorización por rol.
 *
 * Recibe uno o varios roles permitidos y devuelve un middleware que comprueba
 * si el usuario autenticado (req.user) tiene alguno de esos roles.
 *
 * Debe usarse siempre después de authMiddleware, que es quien popula req.user.
 *
 * Uso en una ruta:
 *   router.get('/admin', authMiddleware, roleMiddleware('admin'), handler)
 *   router.get('/staff', authMiddleware, roleMiddleware('admin', 'staff'), handler)
 *
 * @param {...string} roles - Roles que tienen acceso a la ruta
 */
export const roleMiddleware = (...roles) => {
    return (req, res, next) => {
        // authMiddleware debe haber sido ejecutado antes
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Comprobamos si el rol del usuario está entre los roles permitidos
        if (!roles.includes(req.user.role)) {
            return res
                .status(403)
                .json({ message: 'Forbidden: insufficient permissions' });
        }

        next();
    };
};
