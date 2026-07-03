import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { usersRouter } from './users.routes.js';
import { ordersRouter } from './orders.routes.js';
import { productsRouter } from './products.routes.js';
import { cartRouter } from './cart.routes.js';
import { categoriesRouter } from './categories.routes.js';
import { reviewsRouter } from './reviews.routes.js';
import { homeContentRouter } from './home-content.routes.js';
import { supplierRouter } from './supplier.routes.js';
import { suppliersRouter } from './suppliers.routes.js';

export const router = Router();

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/orders', ordersRouter);
router.use('/products', productsRouter);
router.use('/cart', cartRouter);
router.use('/categories', categoriesRouter);
router.use('/reviews', reviewsRouter);
router.use('/home-content', homeContentRouter);
router.use('/supplier', supplierRouter);
router.use('/suppliers', suppliersRouter);
