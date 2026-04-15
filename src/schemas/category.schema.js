import { z } from 'zod';

/**
 * Schema para crear una categoría.
 * El slug se genera automáticamente en el modelo (pre-save hook),
 * por lo que no es necesario enviarlo desde el cliente.
 */
export const createCategorySchema = z.object({
    name: z
        .string({ error: 'Category name is required' })
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(80, 'Name must be at most 80 characters'),
    description: z.string().trim().max(500).optional(),
});

/**
 * Schema para actualizar una categoría (PATCH parcial).
 */
export const updateCategorySchema = createCategorySchema.partial();
