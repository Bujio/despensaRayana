import mongoose, { Schema } from 'mongoose';

export const HOME_SECTION_TYPES = [
    'hero',
    'trust',
    'categories',
    'featured',
    'custom',
    'productCarousel',
    'promoBanner',
    'promoBannerGrid',
];

export const HOME_SECTION_STATUSES = [
    'draft',
    'published',
    'scheduled',
    'archived',
];

const CmsTrackingFields = {
    trackingId: { type: String, trim: true },
    campaignName: { type: String, trim: true },
};

const CmsImageFields = {
    imageUrl: { type: String, trim: true },
    mobileImageUrl: { type: String, trim: true },
    altText: { type: String, trim: true },
};

const HeroSchema = new Schema(
    {
        eyebrow: { type: String, trim: true },
        title: { type: String, trim: true },
        description: { type: String, trim: true },
        primaryLabel: { type: String, trim: true },
        secondaryLabel: { type: String, trim: true },
        ...CmsImageFields,
        ...CmsTrackingFields,
    },
    { _id: false },
);

const SectionItemSchema = new Schema(
    {
        icon: { type: String, trim: true },
        title: { type: String, trim: true },
        body: { type: String, trim: true },
        ctaLabel: { type: String, trim: true },
        linkUrl: { type: String, trim: true },
        ...CmsImageFields,
        ...CmsTrackingFields,
    },
    { _id: false, strict: false },
);

const SectionSchema = new Schema(
    {
        id: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: HOME_SECTION_TYPES,
            required: true,
        },
        title: { type: String, required: true, trim: true },
        subtitle: { type: String, trim: true },
        body: { type: String, trim: true },
        ctaLabel: { type: String, trim: true },
        linkUrl: { type: String, trim: true },
        ...CmsImageFields,
        ...CmsTrackingFields,
        items: { type: [SectionItemSchema], default: [] },
        productIds: [{ type: String, trim: true }],
        enabled: { type: Boolean, default: true },
        locked: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
        status: {
            type: String,
            enum: HOME_SECTION_STATUSES,
            default: 'published',
        },
        startDate: { type: Date, default: null },
        endDate: { type: Date, default: null },
        priority: { type: Number, default: 0 },
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
