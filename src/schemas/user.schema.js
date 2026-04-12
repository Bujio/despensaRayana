import { z } from 'zod';

/**
 * Schema de dirección, reutilizable en registro y actualización.
 * Todos los campos son opcionales porque la dirección completa no es obligatoria.
 */
const addressSchema = z.object({
    country: z.string().min(2).optional(),
    street: z.string().min(3).optional(),
    codePostal: z.string().min(3).optional(),
});

/**
 * Schema para el registro de un nuevo usuario.
 * Valida que los campos obligatorios estén presentes y con el formato correcto.
 */
export const registerSchema = z.object({
    name: z
        .string({ error: 'Name is required' })
        .min(2, 'Name must be at least 2 characters'),
    // En Zod v4 se usa z.email() directamente, no z.string().email()
    email: z.email({ error: 'Invalid email format' }),
    // La contraseña debe tener al menos 6 caracteres, una mayúscula y un número
    password: z
        .string({ error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    phone: z.string().optional(),
    address: addressSchema.optional(),
});

/**
 * Schema para el login.
 * Solo requiere email y contraseña; no validamos formato de password
 * para no dar pistas sobre los requisitos al intentar acceder con credenciales ajenas.
 */
export const loginSchema = z.object({
    email: z.email({ error: 'Invalid email format' }),
    password: z.string({ error: 'Password is required' }),
});

/**
 * Schema para actualizar un usuario existente.
 * Todos los campos son opcionales (PATCH parcial).
 * .partial() convierte todos los campos del registerSchema en opcionales.
 */
export const updateUserSchema = registerSchema.partial();
