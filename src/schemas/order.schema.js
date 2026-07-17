import { z } from 'zod';

/**
 * Schema para cada línea de producto dentro de un pedido.
 * Refleja el modelo ProductsOrderSchema de Mongoose.
 */
const orderProductSchema = z.object({
    // Normalizamos el SKU a mayúsculas para coincidir con el formato guardado
    // en la colección de productos (ver product.schema.js).
    sku: z
        .string({ error: 'SKU is required' })
        .trim()
        .min(1)
        .max(50)
        .transform((val) => val.toUpperCase()),
    count: z
        .number()
        .int()
        .positive('Count must be a positive integer')
        .max(10_000, 'Count is too large')
        .optional(),
    // El cliente solo puede enviar SKU y cantidad. Precio, descuento,
    // impuesto y total se calculan siempre en el backend desde Product.
});

const shippingAddressSchema = z
    .object({
        street: z.string().trim().min(3).max(160),
        codePostal: z
            .string()
            .trim()
            .regex(/^\d{5}$/),
        city: z.string().trim().min(2).max(80),
        country: z.string().trim().min(2).max(80),
        phone: z.string().trim().min(6).max(30),
    })
    .optional();

/**
 * Schema para crear un pedido.
 * El email se normaliza a minúsculas para coincidir con el modelo (lowercase: true).
 * La fecha es opcional; si no viene, se puede asignar en el service o modelo.
 *
 * El límite de 100 productos por pedido protege contra pedidos excesivos que
 * harían que `decrementStockAtomic` tarde demasiado o sature la BD.
 */
export const createOrderSchema = z.object({
    email: z
        .email({ error: 'Invalid email format' })
        .max(254)
        .transform((val) => val.toLowerCase().trim()),
    date: z.coerce.date().optional(),
    shippingAddress: shippingAddressSchema,
    paymentMethod: z.enum(['external_pending', 'manual_transfer']).optional(),
    products: z
        .array(orderProductSchema)
        .min(1, 'The order must contain at least one product')
        .max(100, 'The order cannot contain more than 100 products'),
    // Los descuentos y totales del pedido no se aceptan desde el cliente.
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

export const cancelOrderSchema = z.object({
    reason: z.string().trim().max(500).optional(),
});
