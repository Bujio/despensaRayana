import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { usersRouter } from './users.routes.js';
import { ordersRouter } from './orders.routes.js';
import { productsRouter } from './products.routes.js';
import { cartRouter } from './cart.routes.js';
import { categoriesRouter } from './categories.routes.js';

export const router = Router();

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/orders', ordersRouter);
router.use('/products', productsRouter);
router.use('/cart', cartRouter);
router.use('/categories', categoriesRouter);
