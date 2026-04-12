import { ZodError } from 'zod';

/**
 * Middleware genérico de validación con Zod.
 *
 * Recibe un schema de Zod, valida req.body contra él y, si es válido,
 * sobreescribe req.body con el valor parseado (ya limpio y transformado).
 * Si falla, devuelve 400 con los errores detallados sin llegar al controller.
 *
 * Uso en una ruta:
 *   router.post('/', validate(mySchema), myController)
 *
 * @param {import('zod').ZodSchema} schema - Schema de Zod a aplicar
 */
export const validate = (schema) => (req, res, next) => {
    try {
        // parse() lanza ZodError si el body no cumple el schema.
        // El resultado es el objeto ya transformado (trim, lowercase, etc.)
        req.body = schema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            // Extraemos solo el campo y el mensaje de cada error para no exponer
            // información interna de la estructura del schema al cliente
            const errors = error.errors.map(({ path, message }) => ({
                field: path.join('.'),
                message,
            }));
            return res.status(400).json({ errors });
        }
        next(error);
    }
};
