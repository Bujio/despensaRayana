import { z } from 'zod';

export const supplierStatusSchema = z.enum([
    'pending_review',
    'active',
    'inactive',
    'draft',
    'rejected',
]);

const optionalText = (max = 500) => z.string().trim().max(max).optional();
const optionalUrl = z.url('Invalid URL').optional().or(z.literal(''));
const optionalEmail = z
    .email({ error: 'Invalid email format' })
    .max(254)
    .transform((value) => value.toLowerCase().trim())
    .optional()
    .or(z.literal(''));

const imageSchema = z
    .object({
        url: optionalUrl,
        name: optionalText(120),
        alt: optionalText(180),
        isMain: z.boolean().optional(),
    })
    .optional();

const galleryImageSchema = z.object({
    url: z.url('Invalid image URL'),
    name: optionalText(120),
    alt: optionalText(180),
    isMain: z.boolean().optional(),
});

const locationSchema = z
    .object({
        country: optionalText(100),
        region: optionalText(120),
        province: optionalText(120),
        comarca: optionalText(120),
        town: optionalText(120),
        postalCode: optionalText(20),
        address: optionalText(220),
        coordinates: z
            .object({
                lat: z.coerce.number().min(-90).max(90).optional(),
                lng: z.coerce.number().min(-180).max(180).optional(),
            })
            .optional(),
    })
    .optional();

const addressSchema = z
    .object({
        country: optionalText(100),
        street: optionalText(200),
        codePostal: optionalText(20),
        city: optionalText(100),
    })
    .optional();

const contactSchema = z
    .object({
        contactPerson: optionalText(120),
        email: optionalEmail,
        phone: optionalText(30),
        website: optionalUrl,
        instagram: optionalText(120),
        facebook: optionalText(120),
    })
    .optional();

const businessSchema = z
    .object({
        taxName: optionalText(160),
        taxId: optionalText(40),
        invoiceEmail: optionalEmail,
    })
    .optional();

const certificationsSchema = z
    .object({
        artisan: z.boolean().optional(),
        ecological: z.boolean().optional(),
        dop: z.boolean().optional(),
        igp: z.boolean().optional(),
        localProduct: z.boolean().optional(),
        familyProduction: z.boolean().optional(),
        noIntermediaries: z.boolean().optional(),
    })
    .optional();

const supplierProfileFields = {
    name: z.string({ error: 'Name is required' }).trim().min(2).max(120),
    legalName: optionalText(160),
    slug: optionalText(140),
    shortDescription: optionalText(300),
    description: optionalText(5000),
    story: optionalText(5000),
    specialties: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
    origin: optionalText(160),
    phone: optionalText(30),
    address: addressSchema,
    location: locationSchema,
    contact: contactSchema,
    business: businessSchema,
    logo: imageSchema,
    mainImage: imageSchema,
    gallery: z.array(galleryImageSchema).max(20).optional(),
    certifications: certificationsSchema,
};

export const registerSupplierSchema = z.object({
    ...supplierProfileFields,
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
});

export const updateSupplierProfileSchema = z
    .object(supplierProfileFields)
    .partial()
    .strict();

export const rejectSupplierSchema = z.object({
    reason: z.string().trim().max(1200).optional(),
});

export const featuredSupplierSchema = z.object({
    featured: z.boolean(),
});

export const supplierInternalNotesSchema = z.object({
    internalNotes: z.string().trim().max(4000).optional().default(''),
});
