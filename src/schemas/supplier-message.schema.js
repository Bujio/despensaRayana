import { z } from 'zod';

export const createSupplierMessageSchema = z.object({
    subject: z.string().trim().max(140).optional().default(''),
    message: z
        .string()
        .trim()
        .min(3, 'El mensaje debe tener al menos 3 caracteres.')
        .max(2000, 'El mensaje no puede superar 2000 caracteres.'),
});

export const replySupplierMessageSchema = z.object({
    message: z
        .string()
        .trim()
        .min(3, 'La respuesta debe tener al menos 3 caracteres.')
        .max(2000, 'La respuesta no puede superar 2000 caracteres.'),
});
