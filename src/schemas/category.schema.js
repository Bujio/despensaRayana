import { z } from 'zod';

/**
 * Schema para crear una categoría.
 * El slug se genera automáticamente en el modelo (pre-save hook),
 * por lo que no es necesario enviarlo desde el cliente.
 */
export const createCategorySchema = z.object({
    name: z
        .string({ required_error: 'Category name is required' })
        .min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
});

/**
 * Schema para actualizar una categoría (PATCH parcial).
 */
export const updateCategorySchema = createCategorySchema.partial();
