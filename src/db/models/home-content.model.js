import mongoose, { Schema } from 'mongoose';

const HeroSchema = new Schema(
    {
        eyebrow: { type: String, trim: true },
        title: { type: String, trim: true },
        description: { type: String, trim: true },
        primaryLabel: { type: String, trim: true },
        secondaryLabel: { type: String, trim: true },
        imageUrl: { type: String, trim: true },
    },
    { _id: false },
);

const SectionSchema = new Schema(
    {
        id: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: ['hero', 'trust', 'categories', 'featured', 'custom', 'productCarousel', 'promoBanner', 'promoBannerGrid'],
            required: true,
        },
        title: { type: String, required: true, trim: true },
        subtitle: { type: String, trim: true },
        body: { type: String, trim: true },
        ctaLabel: { type: String, trim: true },
        imageUrl: { type: String, trim: true },
        items: { type: [Schema.Types.Mixed], default: [] },
        linkUrl: { type: String, trim: true },
        productIds: [{ type: String, trim: true }],
        enabled: { type: Boolean, default: true },
        locked: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
    },
    { _id: false },
);

const HomeContentSchema = new Schema(
    {
        key: {
            type: String,
            default: 'homepage',
            unique: true,
            immutable: true,
        },
        hero: {
            type: HeroSchema,
            default: () => ({}),
        },
        featuredProductIds: [{ type: String, trim: true }],
        sections: {
            type: [SectionSchema],
            default: [],
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true },
);

export const HomeContent = mongoose.model('HomeContent', HomeContentSchema);
