import { z } from 'zod';

/**
 * Schema para cada imagen del proveedor.
 * La URL es obligatoria; el nombre es descriptivo y opcional.
 */
const imageSchema = z.object({
    // z.url() es la forma correcta en Zod v4 (z.string().url() está deprecado)
    url: z.url('Invalid image URL'),
    name: z.string().optional(),
});

/**
 * Schema del proveedor (supplier) del producto.
 * Refleja la estructura del modelo: id numérico, nombre e imágenes.
 */
const supplierSchema = z.object({
    id: z.number({ required_error: 'Supplier ID is required' }),
    name: z.string().optional(),
    images: z.array(imageSchema).optional(),
});

/**
 * Schema para crear un producto.
 * El SKU se normaliza a mayúsculas para evitar duplicados por capitalización.
 */
export const createProductSchema = z.object({
    name: z
        .string({ required_error: 'Product name is required' })
        .min(2, 'Name must be at least 2 characters'),
    // transform() asegura que el SKU siempre se guarda en mayúsculas
    sku: z
        .string({ required_error: 'SKU is required' })
        .min(2, 'SKU must be at least 2 characters')
        .transform((val) => val.toUpperCase()),
    price: z
        .number({ required_error: 'Price is required' })
        .positive('Price must be a positive number'),
    description: z.string().optional(),
    // ID de MongoDB de la categoría. Opcional al crear un producto.
    categoryId: z.string().optional(),
    stock: z
        .number({ required_error: 'Stock is required' })
        .int('Stock must be an integer')
        .min(0, 'Stock cannot be negative'),
    supplier: supplierSchema,
});

/**
 * Schema para actualizar un producto (PATCH parcial).
 * .partial() hace todos los campos opcionales; solo se validan los que vengan.
 */
export const updateProductSchema = createProductSchema.partial();
