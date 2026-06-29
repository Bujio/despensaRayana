import { z } from 'zod';

const heroSchema = z.object({
    eyebrow: z.string().trim().max(120).optional().default(''),
    title: z.string().trim().min(2).max(180).optional().default(''),
    description: z.string().trim().max(500).optional().default(''),
    primaryLabel: z.string().trim().max(60).optional().default(''),
    secondaryLabel: z.string().trim().max(60).optional().default(''),
    imageUrl: z.string().trim().max(1000).optional().default(''),
});

const sectionSchema = z.object({
    id: z.string().trim().min(1).max(80),
    type: z.enum(['hero', 'trust', 'categories', 'featured', 'custom', 'productCarousel', 'promoBanner', 'promoBannerGrid']),
    title: z.string().trim().min(1).max(120),
    subtitle: z.string().trim().max(160).optional().default(''),
    body: z.string().trim().max(1200).optional().default(''),
    ctaLabel: z.string().trim().max(80).optional().default(''),
    imageUrl: z.string().trim().max(1000).optional().default(''),
    items: z.array(z.object({
        title: z.string().trim().max(120).optional().default(''),
        body: z.string().trim().max(500).optional().default(''),
        imageUrl: z.string().trim().max(1000).optional().default(''),
        linkUrl: z.string().trim().max(1000).optional().default(''),
    })).max(6).optional().default([]),
    linkUrl: z.string().trim().max(1000).optional().default(''),
    productIds: z.array(z.string().trim().min(1).max(120)).max(24).optional().default([]),
    enabled: z.boolean().optional().default(true),
    locked: z.boolean().optional().default(false),
    order: z.number().int().min(0).optional().default(0),
});

export const updateHomeContentSchema = z.object({
    hero: heroSchema.optional(),
    featuredProductIds: z.array(z.string().trim().min(1).max(120)).optional(),
    sections: z.array(sectionSchema).min(1).max(20).optional(),
});
