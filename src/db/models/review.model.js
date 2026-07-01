import mongoose, { Schema } from 'mongoose';

const ReviewSchema = new Schema(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
            index: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        title: {
            type: String,
            trim: true,
            maxlength: 120,
        },
        comment: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
    },
    { timestamps: true },
);

ReviewSchema.index({ product: 1, user: 1 }, { unique: true });

export const Review = mongoose.model('Review', ReviewSchema);
