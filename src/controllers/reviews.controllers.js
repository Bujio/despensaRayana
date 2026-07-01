import mongoose from 'mongoose';
import {
    listProductReviewsService,
    listUserReviewsService,
    listReviewsService,
    createReviewService,
    getReviewService,
    updateReviewService,
    deleteReviewService,
} from '../services/reviews.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { HttpError } from '../utils/http-error.js';

const assertValidObjectId = (id, label = 'id') => {
    if (!mongoose.isValidObjectId(id)) {
        throw new HttpError(`Invalid ${label} format`, 400);
    }
};

const canManageReview = (req, review) =>
    req.user?.role === 'admin' ||
    String(review.user?._id || review.user) === String(req.user?.id);

export const reviewsController = () => {
    const listProductReviews = async (req, res, next) => {
        try {
            assertValidObjectId(req.params.productId, 'productId');
            const reviews = await listProductReviewsService(
                req.params.productId,
            );
            return res.status(200).json(reviews);
        } catch (error) {
            next(error);
        }
    };

    const listMyReviews = async (req, res, next) => {
        try {
            const reviews = await listUserReviewsService(req.user.id);
            return res.status(200).json(reviews);
        } catch (error) {
            next(error);
        }
    };

    const listReviews = async (req, res, next) => {
        try {
            const pagination = getPagination(req.query);
            const { productId, userId } = req.query;
            if (productId) assertValidObjectId(productId, 'productId');
            if (userId) assertValidObjectId(userId, 'userId');

            const { data, total } = await listReviewsService(pagination, {
                productId,
                userId,
            });
            return res.status(200).json({
                data,
                pagination: buildPaginationMeta(
                    total,
                    pagination.page,
                    pagination.limit,
                ),
            });
        } catch (error) {
            next(error);
        }
    };

    const createProductReview = async (req, res, next) => {
        try {
            assertValidObjectId(req.params.productId, 'productId');
            const review = await createReviewService(
                req.params.productId,
                req.user.id,
                req.body,
            );
            return res.status(201).json(review);
        } catch (error) {
            next(error);
        }
    };

    const updateReview = async (req, res, next) => {
        try {
            assertValidObjectId(req.params.id);
            const existingReview = await getReviewService(req.params.id);
            if (!existingReview) throw new HttpError('Review not found', 404);
            if (!canManageReview(req, existingReview))
                throw new HttpError('Forbidden', 403);

            const review = await updateReviewService(req.params.id, req.body);
            return res.status(200).json(review);
        } catch (error) {
            next(error);
        }
    };

    const deleteReview = async (req, res, next) => {
        try {
            assertValidObjectId(req.params.id);
            const existingReview = await getReviewService(req.params.id);
            if (!existingReview) throw new HttpError('Review not found', 404);
            if (!canManageReview(req, existingReview))
                throw new HttpError('Forbidden', 403);

            await deleteReviewService(req.params.id);
            return res
                .status(200)
                .json({ message: 'Review deleted successfully' });
        } catch (error) {
            next(error);
        }
    };

    return {
        listProductReviews,
        listMyReviews,
        listReviews,
        createProductReview,
        updateReview,
        deleteReview,
    };
};
