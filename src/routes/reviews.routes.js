import { Router } from 'express';
import { reviewsController } from '../controllers/reviews.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { writeLimiter } from '../middlewares/ratelimit.middleware.js';
import {
    createReviewSchema,
    updateReviewSchema,
} from '../schemas/review.schema.js';

const {
    listProductReviews,
    listMyReviews,
    listReviews,
    createProductReview,
    updateReview,
    deleteReview,
} = reviewsController();

export const reviewsRouter = Router();

reviewsRouter.get('/me', authMiddleware, listMyReviews);
reviewsRouter.get('/', authMiddleware, roleMiddleware('admin'), listReviews);
reviewsRouter.get('/product/:productId', listProductReviews);
reviewsRouter.post(
    '/product/:productId',
    writeLimiter,
    authMiddleware,
    validate(createReviewSchema),
    createProductReview,
);
reviewsRouter.patch(
    '/:id',
    writeLimiter,
    authMiddleware,
    validate(updateReviewSchema),
    updateReview,
);
reviewsRouter.delete('/:id', writeLimiter, authMiddleware, deleteReview);
