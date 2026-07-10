import { z } from 'zod';

const sectionTypes = [
    'hero',
    'trust',
    'categories',
    'featured',
    'custom',
    'productCarousel',
    'promoBanner',
    'promoBannerGrid',
];

const sectionStatuses = ['draft', 'published', 'scheduled', 'archived'];

const limitedText = (max) => z.string().trim().max(max).optional().default('');
const urlText = z.string().trim().max(1200).optional().default('');
const optionalDate = z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce.date().nullable().optional(),
);

const trackingSchema = {
    trackingId: limitedText(120),
    campaignName: limitedText(160),
};

const imageSchema = {
    imageUrl: urlText,
    mobileImageUrl: urlText,
    altText: limitedText(180),
};

const heroSchema = z.object({
    eyebrow: limitedText(120),
    title: limitedText(180),
    description: limitedText(500),
    primaryLabel: limitedText(60),
    secondaryLabel: limitedText(60),
    ...imageSchema,
    ...trackingSchema,
});

const sectionItemSchema = z
    .object({
        icon: limitedText(80),
        title: limitedText(120),
        body: limitedText(700),
        ctaLabel: limitedText(80),
        linkUrl: urlText,
        ...imageSchema,
        ...trackingSchema,
    })
    .passthrough();

const sectionSchema = z.object({
    id: z.string().trim().min(1).max(80),
    type: z.enum(sectionTypes),
    title: z.string().trim().min(1).max(140),
    subtitle: limitedText(180),
    body: limitedText(1600),
    ctaLabel: limitedText(80),
    linkUrl: urlText,
    ...imageSchema,
    ...trackingSchema,
    items: z.array(sectionItemSchema).max(12).optional().default([]),
    productIds: z
        .array(z.string().trim().min(1).max(120))
        .max(48)
        .optional()
        .default([]),
    enabled: z.boolean().optional().default(true),
    locked: z.boolean().optional().default(false),
    order: z.coerce.number().int().min(0).max(1000).optional().default(0),
    status: z.enum(sectionStatuses).optional().default('published'),
    startDate: optionalDate,
    endDate: optionalDate,
    priority: z.coerce
        .number()
        .int()
        .min(-1000)
        .max(1000)
        .optional()
        .default(0),
});

export const updateHomeContentSchema = z.object({
    hero: heroSchema.optional(),
    featuredProductIds: z
        .array(z.string().trim().min(1).max(120))
        .max(48)
        .optional(),
    sections: z.array(sectionSchema).min(1).max(30).optional(),
});
