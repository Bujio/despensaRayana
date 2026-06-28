import {
    getOrderService,
    listOrdersService,
    listOrdersByEmailService,
    createOrderService,
    updateOrderService,
    updateOrderStatusService,
    deleteOrderService,
} from '../services/orders.js';
import { Cart } from '../db/models/cart.model.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { assertOwnerOrAdmin } from '../utils/authz.js';
import { HttpError } from '../utils/http-error.js';
import { logger } from '../utils/logger.js';

const normalizeEmail = (email) => String(email || '').toLowerCase().trim();

const isOrderOwner = (req, order) => {
    const orderUserId = order.userId?.toString?.() || String(order.userId || '');
    if (orderUserId) return orderUserId === String(req.user.id);

    // Fallback para pedidos antiguos creados antes de guardar userId.
    return normalizeEmail(req.user.email) === normalizeEmail(order.email);
};

export const ordersController = () => {
    const getOrder = async (req, res, next) => {
        try {
            const order = await getOrderService(req.params.id);
            if (!order) throw new HttpError('Order not found', 404);
            assertOwnerOrAdmin(req, isOrderOwner(req, order));
            return res.status(200).json(order);
        } catch (error) {
            next(error);
        }
    };

    const listOrders = async (req, res, next) => {
        try {
            const pagination = getPagination(req.query);
            const { data, total } = await listOrdersService(pagination);
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

    const listOrdersByEmail = async (req, res, next) => {
        try {
            // Normalizamos a minúsculas porque los emails se guardan lowercase
            const targetEmail = normalizeEmail(req.params.email);
            const currentEmail = normalizeEmail(req.user.email);
            assertOwnerOrAdmin(req, currentEmail === targetEmail);
            const pagination = getPagination(req.query);
            const { data, total } = await listOrdersByEmailService(
                targetEmail,
                pagination,
                req.user.role === 'admin' ? null : req.user.id,
            );
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

    const createOrder = async (req, res, next) => {
        try {
            // El cliente autenticado solo puede crear pedidos a su propio email.
            // Los admins pueden crear pedidos para cualquier email (para casos de soporte).
            const currentEmail = normalizeEmail(req.user.email);
            const requestedEmail = normalizeEmail(req.body.email);
            if (req.user.role !== 'admin' && requestedEmail !== currentEmail) {
                throw new HttpError(
                    'Forbidden: cannot create orders for other users',
                    403,
                );
            }

            const orderData = {
                ...req.body,
                email: req.user.role === 'admin' ? requestedEmail : currentEmail,
                userId:
                    req.user.role === 'admin' && requestedEmail !== currentEmail
                        ? undefined
                        : req.user.id,
            };
            const order = await createOrderService(orderData);

            // Vaciamos el carrito del usuario tras crear el pedido.
            // Best-effort: un fallo aquí no debe impactar al usuario — el
            // pedido ya se creó correctamente. Usamos updateOne para no
            // fallar si el usuario no tenía carrito.
            Cart.updateOne(
                { userId: req.user.id },
                { $set: { items: [] } },
            ).catch((err) =>
                logger.error('Failed to clear cart after order:', err.message),
            );

            return res.status(201).json(order);
        } catch (error) {
            next(error);
        }
    };

    const updateOrder = async (req, res, next) => {
        try {
            const order = await getOrderService(req.params.id);
            if (!order) throw new HttpError('Order not found', 404);
            assertOwnerOrAdmin(req, isOrderOwner(req, order));

            // Excluimos 'products' del body: cambiar las líneas de un pedido
            // existente requeriría reajustar el stock, lo que no hace este endpoint.
            // Para eso se debe borrar y recrear el pedido.
            const { products: _ignored, userId: _userId, ...safeData } = req.body;
            const updated = await updateOrderService(req.params.id, safeData);
            return res.status(200).json(updated);
        } catch (error) {
            next(error);
        }
    };

    const updateOrderStatus = async (req, res, next) => {
        try {
            const order = await updateOrderStatusService(
                req.params.id,
                req.body.status,
            );
            return res.status(200).json(order);
        } catch (error) {
            next(error);
        }
    };

    const deleteOrder = async (req, res, next) => {
        try {
            const order = await deleteOrderService(req.params.id);
            if (!order) throw new HttpError('Order not found', 404);
            return res
                .status(200)
                .json({ message: 'Order deleted successfully' });
        } catch (error) {
            next(error);
        }
    };

    return {
        getOrder,
        listOrders,
        listOrdersByEmail,
        createOrder,
        updateOrder,
        updateOrderStatus,
        deleteOrder,
    };
};
