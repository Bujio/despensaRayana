import { z } from 'zod';
import mongoose from 'mongoose';

/**
 * Schema para cada imagen del proveedor.
 * La URL es obligatoria; el nombre es descriptivo y opcional.
 */
const imageSchema = z.object({
    // z.url() es la forma correcta en Zod v4 (z.string().url() está deprecado)
    url: z.url('Invalid image URL'),
    name: z.string().trim().max(120).optional(),
});

/**
 * Schema del proveedor (supplier) del producto.
 * Refleja la estructura del modelo: id numérico, nombre e imágenes.
 */
const supplierSchema = z.object({
    id: z.number({ error: 'Supplier ID is required' }).int().nonnegative(),
    name: z.string().trim().max(120).optional(),
    images: z.array(imageSchema).max(20).optional(),
});

const offerSchema = z
    .object({
        type: z.enum(['none', 'percent', 'amount', 'bundle']).default('none'),
        value: z.number().min(0).optional().default(0),
        bundleQuantity: z.number().int().min(0).optional().default(0),
        bundlePayQuantity: z.number().int().min(0).optional().default(0),
        label: z.string().trim().max(120).optional(),
        active: z.boolean().optional().default(false),
    })
    .superRefine((offer, ctx) => {
        if (offer.type === 'percent' && (offer.value <= 0 || offer.value > 100)) {
            ctx.addIssue({
                code: 'custom',
                path: ['value'],
                message: 'Percent offers must be between 1 and 100',
            });
        }

        if (offer.type === 'amount' && offer.value <= 0) {
            ctx.addIssue({
                code: 'custom',
                path: ['value'],
                message: 'Amount offers must be greater than 0',
            });
        }

        if (offer.type === 'bundle') {
            if (offer.bundleQuantity < 2) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['bundleQuantity'],
                    message: 'Bundle quantity must be at least 2',
                });
            }
            if (
                offer.bundlePayQuantity < 1 ||
                offer.bundlePayQuantity >= offer.bundleQuantity
            ) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['bundlePayQuantity'],
                    message: 'Bundle pay quantity must be lower than bundle quantity',
                });
            }
        }
    })
    .optional();

/**
 * Validador reutilizable de ObjectId de MongoDB.
 * Zod no distingue strings de ObjectId por defecto; con este refine devolvemos
 * un 400 claro antes de que Mongoose lance un CastError al guardar.
 */
const objectIdString = z
    .string()
    .refine((val) => mongoose.isValidObjectId(val), {
        message: 'Invalid ObjectId format',
    });

/**
 * Schema para crear un producto.
 * El SKU se normaliza a mayúsculas para evitar duplicados por capitalización.
 *
 * Nota: el campo se llama `category` (no `categoryId`) para coincidir con
 * el nombre del campo en el modelo de Mongoose, y así poder pasar los datos
 * directamente a Product.create(data) sin mapear.
 */
export const createProductSchema = z.object({
    name: z
        .string({ error: 'Product name is required' })
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(120, 'Name must be at most 120 characters'),
    // transform() asegura que el SKU siempre se guarda en mayúsculas
    sku: z
        .string({ error: 'SKU is required' })
        .trim()
        .min(2, 'SKU must be at least 2 characters')
        .max(50, 'SKU must be at most 50 characters')
        .transform((val) => val.toUpperCase()),
    price: z
        .number({ error: 'Price is required' })
        .positive('Price must be a positive number'),
    description: z.string().trim().max(5000).optional(),
    // ID de MongoDB de la categoría. Opcional al crear un producto.
    category: objectIdString.optional(),
    stock: z
        .number({ error: 'Stock is required' })
        .int('Stock must be an integer')
        .min(0, 'Stock cannot be negative'),
    offer: offerSchema,
    supplier: supplierSchema,
});

/**
 * Schema para actualizar un producto (PATCH parcial).
 * .partial() hace todos los campos opcionales; solo se validan los que vengan.
 */
export const updateProductSchema = createProductSchema.partial();
