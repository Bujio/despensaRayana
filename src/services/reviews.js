import { Review } from '../db/models/review.model.js';

const populateReview = (query) =>
    query
        .populate('product', 'name sku supplier.images category')
        .populate('user', 'name email');

export const listProductReviewsService = async (productId) => {
    return await populateReview(
        Review.find({ product: productId }).sort({ createdAt: -1 }),
    );
};

export const listUserReviewsService = async (userId) => {
    return await populateReview(
        Review.find({ user: userId }).sort({ updatedAt: -1 }),
    );
};

export const listReviewsService = async ({ skip, limit }, filters = {}) => {
    const queryFilter = {};
    if (filters.productId) queryFilter.product = filters.productId;
    if (filters.userId) queryFilter.user = filters.userId;

    const query = populateReview(
        Review.find(queryFilter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
    );
    const [data, total] = await Promise.all([
        query,
        Review.countDocuments(queryFilter),
    ]);
    return { data, total };
};

export const createReviewService = async (productId, userId, data) => {
    return await populateReview(
        Review.findOneAndUpdate(
            { product: productId, user: userId },
            { ...data, product: productId, user: userId },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
                runValidators: true,
            },
        ),
    );
};

export const getReviewService = async (reviewId) => {
    return await populateReview(Review.findById(reviewId));
};

export const updateReviewService = async (reviewId, data) => {
    return await populateReview(
        Review.findByIdAndUpdate(reviewId, data, {
            new: true,
            runValidators: true,
        }),
    );
};

export const deleteReviewService = async (reviewId) => {
    return await Review.findByIdAndDelete(reviewId);
};
