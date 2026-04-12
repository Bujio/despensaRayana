import { Router } from 'express';
import { ordersController } from '../controllers/orders.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    createOrderSchema,
    updateOrderSchema,
} from '../schemas/order.schema.js';

const {
    getOrder,
    listOrders,
    listOrdersByEmail,
    createOrder,
    updateOrder,
    deleteOrder,
} = ordersController();

export const ordersRouter = Router();

// Solo el admin puede ver todos los pedidos
ordersRouter.get('/', authMiddleware, roleMiddleware('admin'), listOrders);
// El usuario solo puede ver sus propios pedidos (verificado en el controller)
ordersRouter.get('/client/:email', authMiddleware, listOrdersByEmail);
ordersRouter.get('/:id', authMiddleware, getOrder);
ordersRouter.post(
    '/',
    authMiddleware,
    validate(createOrderSchema),
    createOrder,
);
ordersRouter.patch(
    '/:id',
    authMiddleware,
    validate(updateOrderSchema),
    updateOrder,
);
// Solo el admin puede eliminar pedidos
ordersRouter.delete(
    '/:id',
    authMiddleware,
    roleMiddleware('admin'),
    deleteOrder,
);
