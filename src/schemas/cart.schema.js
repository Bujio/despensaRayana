import { z } from 'zod';

/**
 * Schema para añadir un producto al carrito.
 * La cantidad es opcional — si no viene se asume 1.
 */
export const addCartItemSchema = z.object({
    sku: z.string({ required_error: 'SKU is required' }).min(1),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
});

/**
 * Schema para actualizar la cantidad de un producto en el carrito.
 * Si la cantidad llega a 0 se debe usar DELETE /cart/items/:sku en su lugar.
 */
export const updateCartItemSchema = z.object({
    quantity: z
        .number({ required_error: 'Quantity is required' })
        .int()
        .min(1, 'Quantity must be at least 1'),
});
