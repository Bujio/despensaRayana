import { Router } from 'express';
import { productsController } from '../controllers/products.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';

const {
    getProduct,
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct,
} = productsController();

export const productsRouter = Router();

productsRouter.get('/', listProducts);
productsRouter.get('/:id', getProduct);
productsRouter.post(
    '/',
    authMiddleware,
    roleMiddleware('admin'),
    createProduct,
);
productsRouter.patch(
    '/:id',
    authMiddleware,
    roleMiddleware('admin'),
    updateProduct,
);
productsRouter.delete(
    '/:id',
    authMiddleware,
    roleMiddleware('admin'),
    deleteProduct,
);
