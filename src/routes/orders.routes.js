import { Router } from 'express';
import { ordersController } from '../controllers/orders.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';

const {
    getOrder,
    listOrders,
    listOrdersByEmail,
    createOrder,
    updateOrder,
    deleteOrder,
} = ordersController();

export const ordersRouter = Router();

ordersRouter.get('/', authMiddleware, roleMiddleware('admin'), listOrders);
ordersRouter.get('/client/:email', authMiddleware, listOrdersByEmail);
ordersRouter.get('/:id', authMiddleware, getOrder);
ordersRouter.post('/', authMiddleware, createOrder);
ordersRouter.patch('/:id', authMiddleware, updateOrder);
ordersRouter.delete(
    '/:id',
    authMiddleware,
    roleMiddleware('admin'),
    deleteOrder,
);
