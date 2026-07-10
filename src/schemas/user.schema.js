import { z } from 'zod';

/**
 * Schema de dirección, reutilizable en registro y actualización.
 * Todos los campos son opcionales porque la dirección completa no es obligatoria.
 */
const addressSchema = z.object({
    country: z.string().trim().min(2).max(100).optional(),
    street: z.string().trim().min(3).max(200).optional(),
    codePostal: z.string().trim().min(3).max(20).optional(),
    city: z.string().trim().min(2).max(100).optional(),
});

/**
 * Schema para el registro de un nuevo usuario.
 * Valida que los campos obligatorios estén presentes y con el formato correcto.
 *
 * No incluye `role` — un usuario no puede autoasignarse el rol al registrarse.
 * Los roles se gestionan únicamente desde actualizaciones administrativas.
 */
export const registerSchema = z.object({
    name: z
        .string({ error: 'Name is required' })
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be at most 100 characters'),
    // En Zod v4 se usa z.email() directamente, no z.string().email()
    // El máximo de 254 caracteres viene de RFC 5321.
    email: z
        .email({ error: 'Invalid email format' })
        .max(254, 'Email must be at most 254 characters')
        .transform((val) => val.toLowerCase().trim()),
    // La contraseña debe tener al menos 6 caracteres, una mayúscula y un número.
    // Máximo 128 caracteres para limitar el coste de bcrypt (input arbitrariamente largo).
    password: z
        .string({ error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters')
        .max(128, 'Password must be at most 128 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    phone: z.string().trim().max(30).optional(),
    address: addressSchema.optional(),
});

/**
 * Schema para el login.
 * Solo requiere email y contraseña; no validamos formato de password
 * para no dar pistas sobre los requisitos al intentar acceder con credenciales ajenas.
 */
export const loginSchema = z.object({
    email: z
        .email({ error: 'Invalid email format' })
        .transform((val) => val.toLowerCase().trim()),
    password: z.string({ error: 'Password is required' }).max(128),
});

/**
 * Schema para /auth/refresh y /auth/logout: solo requiere el refresh token.
 */
export const refreshTokenSchema = z.object({
    refreshToken: z
        .string({ error: 'Refresh token is required' })
        .min(1)
        .max(512),
});

/**
 * Schema para /auth/resend-verification: un email al que reenviar el enlace.
 */
export const resendVerificationSchema = z.object({
    email: z
        .email({ error: 'Invalid email format' })
        .transform((val) => val.toLowerCase().trim()),
});

/**
 * Schema para actualizar un usuario existente.
 * Todos los campos son opcionales (PATCH parcial).
 * .partial() convierte todos los campos del registerSchema en opcionales.
 *
 * Añadimos explícitamente `role` aquí (ausente en registerSchema) para que
 * Zod lo preserve en req.body y el controller pueda verificar que solo los
 * admins pueden modificarlo (un usuario normal no puede ascender su propio rol).
 */
export const updateUserSchema = registerSchema
    .partial()
    .extend({ role: z.enum(['user', 'admin', 'supplier']).optional() });

export const requestPasswordResetSchema = z.object({
    email: z
        .email({ error: 'Invalid email format' })
        .transform((val) => val.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
    token: z.string({ error: 'Reset token is required' }).min(1).max(512),
    password: z
        .string({ error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters')
        .max(128, 'Password must be at most 128 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});
