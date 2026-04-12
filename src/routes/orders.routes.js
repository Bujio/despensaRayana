import { Router } from 'express';
import { ordersController } from '../controllers/orders.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { validateObjectId } from '../middlewares/objectid.middleware.js';
import {
    createOrderSchema,
    updateOrderSchema,
    updateOrderStatusSchema,
} from '../schemas/order.schema.js';

const {
    getOrder,
    listOrders,
    listOrdersByEmail,
    createOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
} = ordersController();

export const ordersRouter = Router();

// Solo el admin puede ver todos los pedidos
ordersRouter.get('/', authMiddleware, roleMiddleware('admin'), listOrders);
// El usuario solo puede ver sus propios pedidos (verificado en el controller)
ordersRouter.get('/client/:email', authMiddleware, listOrdersByEmail);
ordersRouter.get('/:id', validateObjectId, authMiddleware, getOrder);
ordersRouter.post(
    '/',
    authMiddleware,
    validate(createOrderSchema),
    createOrder,
);
ordersRouter.patch(
    '/:id',
    validateObjectId,
    authMiddleware,
    validate(updateOrderSchema),
    updateOrder,
);
// Solo el admin puede cambiar el estado de un pedido
ordersRouter.patch(
    '/:id/status',
    validateObjectId,
    authMiddleware,
    roleMiddleware('admin'),
    validate(updateOrderStatusSchema),
    updateOrderStatus,
);
// Solo el admin puede eliminar pedidos
ordersRouter.delete(
    '/:id',
    validateObjectId,
    authMiddleware,
    roleMiddleware('admin'),
    deleteOrder,
);
