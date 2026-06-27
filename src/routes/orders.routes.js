import { Router } from 'express';
import { ordersController } from '../controllers/orders.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { validateObjectId } from '../middlewares/objectid.middleware.js';
import { orderLimiter } from '../middlewares/ratelimit.middleware.js';
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

/**
 * @openapi
 * tags:
 *   name: Orders
 *   description: Pedidos de clientes
 */

/**
 * @openapi
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: Lista todos los pedidos (solo admin)
 *     responses:
 *       200:
 *         description: Página de pedidos
 *   post:
 *     tags: [Orders]
 *     summary: Crea un nuevo pedido para el usuario autenticado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, products]
 *             properties:
 *               email: { type: string, format: email }
 *               products:
 *                 type: array
 *                 items: { $ref: '#/components/schemas/OrderLine' }
 *     responses:
 *       201:
 *         description: Pedido creado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       400: { description: Stock insuficiente }
 *       404: { description: Producto no encontrado }
 * /orders/client/{email}:
 *   get:
 *     tags: [Orders]
 *     summary: Lista los pedidos de un cliente por email (owner o admin)
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema: { type: string, format: email }
 *     responses:
 *       200: { description: Página de pedidos }
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Devuelve un pedido por ID (owner o admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Pedido }
 *       404: { description: No encontrado }
 *   patch:
 *     tags: [Orders]
 *     summary: Actualiza datos del pedido (excepto líneas)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Actualizado }
 *   delete:
 *     tags: [Orders]
 *     summary: Elimina un pedido y repone stock (solo admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Eliminado }
 * /orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Cambia el estado del pedido validando transición (solo admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, shipped, delivered, cancelled]
 *     responses:
 *       200: { description: Estado actualizado }
 *       400: { description: Transición no permitida }
 */
// Solo el admin puede ver todos los pedidos
ordersRouter.get('/', authMiddleware, roleMiddleware('admin'), listOrders);
// El usuario solo puede ver sus propios pedidos (verificado en el controller)
ordersRouter.get('/client/:email', authMiddleware, listOrdersByEmail);
ordersRouter.get('/:id', validateObjectId, authMiddleware, getOrder);
ordersRouter.post(
    '/',
    orderLimiter,
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
