import jwt from 'jsonwebtoken';

/**
 * Middleware de autenticación.
 *
 * Extrae el JWT del header Authorization (formato "Bearer <token>"),
 * lo verifica y adjunta el payload decodificado en req.user para que
 * los controllers y middlewares siguientes puedan acceder a él.
 *
 * Si el token no existe o es inválido, corta la cadena con 401.
 */
export const authMiddleware = (req, res, next) => {
    // El header debe tener el formato: Authorization: Bearer <token>
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    try {
        // verify() lanza un error si el token está expirado o la firma no coincide
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role, email }
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid token' });
    }
};
