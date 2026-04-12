import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { usersRouter } from './users.routes.js';
import { ordersRouter } from './orders.routes.js';
import { productsRouter } from './products.routes.js';

export const router = Router();

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/orders', ordersRouter);
router.use('/products', productsRouter);
