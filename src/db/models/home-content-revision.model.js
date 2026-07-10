import mongoose, { Schema } from 'mongoose';

const HomeContentRevisionSchema = new Schema(
    {
        key: {
            type: String,
            default: 'homepage',
            index: true,
        },
        snapshot: {
            type: Schema.Types.Mixed,
            required: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        restoredFrom: {
            type: Schema.Types.ObjectId,
            ref: 'HomeContentRevision',
        },
    },
    { timestamps: true },
);

HomeContentRevisionSchema.index({ key: 1, createdAt: -1 });

export const HomeContentRevision = mongoose.model(
    'HomeContentRevision',
    HomeContentRevisionSchema,
);
