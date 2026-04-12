import { z } from 'zod';

/**
 * Schema para cada línea de producto dentro de un pedido.
 * Refleja el modelo ProductsOrderSchema de Mongoose.
 */
const orderProductSchema = z.object({
    sku: z.string({ required_error: 'SKU is required' }).min(1),
    count: z
        .number()
        .int()
        .positive('Count must be a positive integer')
        .optional(),
    price: z
        .number({ required_error: 'Price is required' })
        .positive('Price must be a positive number'),
    discount: z.number().min(0).max(100).optional(),
    // El impuesto se guarda como string para admitir formatos como "21%" o "IVA reducido"
    tax: z.string().optional(),
    total: z.number().optional(),
});

/**
 * Schema para crear un pedido.
 * El email se normaliza a minúsculas para coincidir con el modelo (lowercase: true).
 * La fecha es opcional; si no viene, se puede asignar en el service o modelo.
 */
export const createOrderSchema = z.object({
    email: z
        .string({ required_error: 'Email is required' })
        .email('Invalid email format')
        .transform((val) => val.toLowerCase()),
    date: z.coerce.date().optional(),
    // El pedido debe tener al menos un producto
    products: z
        .array(orderProductSchema)
        .min(1, 'The order must contain at least one product'),
    discount: z.number().min(0).max(100).optional(),
    total: z.number().optional(),
});

/**
 * Schema para actualizar un pedido (PATCH parcial).
 * .partial() hace todos los campos opcionales.
 */
export const updateOrderSchema = createOrderSchema.partial();

/**
 * Schema exclusivo para cambiar el estado de un pedido.
 * Se usa en el endpoint PATCH /orders/:id/status, solo accesible por admins.
 * La lógica de transiciones válidas se valida en el service, no aquí,
 * porque depende del estado actual del pedido (dato de la BD).
 */
export const updateOrderStatusSchema = z.object({
    status: z.enum(
        ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        {
            error: 'Status must be one of: pending, processing, shipped, delivered, cancelled',
        },
    ),
});
