import { z } from 'zod';

export const supplierStatusSchema = z.enum([
    'pending_review',
    'active',
    'inactive',
    'draft',
    'rejected',
]);

const addressSchema = z.object({
    country: z.string().trim().min(2).max(100).optional(),
    street: z.string().trim().min(3).max(200).optional(),
    codePostal: z.string().trim().min(3).max(20).optional(),
    city: z.string().trim().min(2).max(100).optional(),
});

export const registerSupplierSchema = z.object({
    name: z.string({ error: 'Name is required' }).trim().min(2).max(100),
    email: z
        .email({ error: 'Invalid email format' })
        .max(254)
        .transform((value) => value.toLowerCase().trim()),
    password: z
        .string({ error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters')
        .max(128, 'Password must be at most 128 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    phone: z.string().trim().max(30).optional(),
    address: addressSchema.optional(),
    legalName: z.string().trim().max(140).optional(),
    description: z.string().trim().max(1200).optional(),
});

export const updateSupplierProfileSchema = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    legalName: z.string().trim().max(140).optional(),
    phone: z.string().trim().max(30).optional(),
    address: addressSchema.optional(),
    description: z.string().trim().max(1200).optional(),
});

export const rejectSupplierSchema = z.object({
    reason: z.string().trim().max(1200).optional(),
});

export const featuredSupplierSchema = z.object({
    featured: z.boolean(),
});

export const supplierInternalNotesSchema = z.object({
    internalNotes: z.string().trim().max(4000).optional().default(''),
});
