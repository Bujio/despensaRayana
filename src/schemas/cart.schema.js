import { z } from 'zod';

// El carrito nunca debería aceptar cantidades desproporcionadas: este límite
// previene inputs erróneos del frontend y ataques de memoria con números enormes.
const MAX_CART_QUANTITY = 10_000;

/**
 * Schema para añadir un producto al carrito.
 * La cantidad es opcional — si no viene se asume 1.
 */
export const addCartItemSchema = z.object({
    // Normalizamos el SKU a mayúsculas para coincidir con el formato guardado
    // en la colección de productos (ver product.schema.js).
    sku: z
        .string({ error: 'SKU is required' })
        .trim()
        .min(1)
        .max(50)
        .transform((val) => val.toUpperCase()),
    quantity: z
        .number()
        .int()
        .min(1, 'Quantity must be at least 1')
        .max(MAX_CART_QUANTITY, `Quantity cannot exceed ${MAX_CART_QUANTITY}`)
        .default(1),
});

/**
 * Schema para actualizar la cantidad de un producto en el carrito.
 * Si la cantidad llega a 0 se debe usar DELETE /cart/items/:sku en su lugar.
 */
export const updateCartItemSchema = z.object({
    quantity: z
        .number({ error: 'Quantity is required' })
        .int()
        .min(1, 'Quantity must be at least 1')
        .max(MAX_CART_QUANTITY, `Quantity cannot exceed ${MAX_CART_QUANTITY}`),
});
