import { z } from 'zod';

export const createReviewSchema = z.object({
    rating: z.number({ error: 'Rating is required' }).int().min(1).max(5),
    title: z.string().trim().max(120).optional().default(''),
    comment: z
        .string({ error: 'Comment is required' })
        .trim()
        .min(3, 'Comment must be at least 3 characters')
        .max(2000, 'Comment must be at most 2000 characters'),
});

export const updateReviewSchema = createReviewSchema.partial();
