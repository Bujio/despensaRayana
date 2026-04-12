import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authController } from '../controllers/auth.controllers.js';
import { validate } from '../middlewares/validate.middleware.js';
import { registerSchema, loginSchema } from '../schemas/user.schema.js';

const { register, login } = authController();

/**
 * Limita los intentos de login a 10 por IP cada 15 minutos.
 * Protege contra ataques de fuerza bruta sobre las credenciales.
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // ventana de 15 minutos
    limit: 10,
    message: {
        message: 'Too many login attempts, please try again in 15 minutes',
    },
    standardHeaders: 'draft-8', // incluye RateLimit headers en la respuesta
    legacyHeaders: false,
});

/**
 * Limita los registros a 5 por IP cada hora.
 * Evita la creación masiva de cuentas desde la misma IP.
 */
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // ventana de 1 hora
    limit: 5,
    message: {
        message:
            'Too many accounts created from this IP, please try again in an hour',
    },
    standardHeaders: 'draft-8',
    legacyHeaders: false,
});

export const authRouter = Router();

// validate(schema) intercepta el body antes de llegar al controller.
// Si no cumple el schema, devuelve 400 sin ejecutar el controller.
authRouter.post(
    '/register',
    registerLimiter,
    validate(registerSchema),
    register,
);
authRouter.post('/login', loginLimiter, validate(loginSchema), login);
