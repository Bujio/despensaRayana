import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authController } from '../controllers/auth.controllers.js';
import { validate } from '../middlewares/validate.middleware.js';
import { skipInTest } from '../middlewares/ratelimit.middleware.js';
import {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    resendVerificationSchema,
    requestPasswordResetSchema,
    resetPasswordSchema,
} from '../schemas/user.schema.js';

const {
    register,
    login,
    refresh,
    logout,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    resetPassword,
} = authController();

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
    skip: skipInTest,
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
    skip: skipInTest,
});

/**
 * Rate limit estricto para reenvíos de verificación: 3 cada hora por IP.
 * Evita usar el endpoint como vector de spam de emails.
 */
const resendLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 3,
    message: { message: 'Too many requests, please try again later' },
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: skipInTest,
});

export const authRouter = Router();

/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: Registro, login y gestión de sesión
 */

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registra un nuevo usuario y envía el email de verificación
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400: { description: Validación fallida }
 *       409: { description: Email ya registrado }
 *       429: { description: Demasiados registros desde esta IP }
 */
authRouter.post(
    '/register',
    registerLimiter,
    validate(registerSchema),
    register,
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Autentica credenciales y devuelve access + refresh token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Tokens emitidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401: { description: Credenciales inválidas }
 *       429: { description: Demasiados intentos de login }
 */
authRouter.post('/login', loginLimiter, validate(loginSchema), login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rota el refresh token y emite un nuevo par access+refresh
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Nuevo par de tokens
 *       401: { description: Refresh token inválido, expirado o reutilizado }
 */
authRouter.post('/refresh', validate(refreshTokenSchema), refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoca el refresh token recibido (logout de ese dispositivo)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       204: { description: Logout exitoso }
 */
authRouter.post('/logout', validate(refreshTokenSchema), logout);

/**
 * @openapi
 * /auth/verify/{token}:
 *   get:
 *     tags: [Auth]
 *     summary: Confirma el email a partir del token del enlace
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Email verificado }
 *       400: { description: Token inválido o expirado }
 */
authRouter.get('/verify/:token', verifyEmail);

/**
 * @openapi
 * /auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Reenvía el email de verificación al email indicado
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Respuesta genérica (no revela si el email existe) }
 *       429: { description: Demasiados reenvíos }
 */
authRouter.post(
    '/resend-verification',
    resendLimiter,
    validate(resendVerificationSchema),
    resendVerification,
);

authRouter.post(
    '/password-reset/request',
    resendLimiter,
    validate(requestPasswordResetSchema),
    requestPasswordReset,
);

authRouter.post(
    '/password-reset/confirm',
    validate(resetPasswordSchema),
    resetPassword,
);
