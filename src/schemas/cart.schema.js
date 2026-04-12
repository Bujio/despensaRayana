import { z } from 'zod';

/**
 * Schema para añadir un producto al carrito.
 * La cantidad es opcional — si no viene se asume 1.
 */
export const addCartItemSchema = z.object({
    // Normalizamos el SKU a mayúsculas para coincidir con el formato guardado
    // en la colección de productos (ver product.schema.js).
    sku: z
        .string({ error: 'SKU is required' })
        .min(1)
        .transform((val) => val.toUpperCase()),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
});

/**
 * Schema para actualizar la cantidad de un producto en el carrito.
 * Si la cantidad llega a 0 se debe usar DELETE /cart/items/:sku en su lugar.
 */
export const updateCartItemSchema = z.object({
    quantity: z
        .number({ error: 'Quantity is required' })
        .int()
        .min(1, 'Quantity must be at least 1'),
});
