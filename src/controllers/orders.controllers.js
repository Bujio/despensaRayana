import {
    getOrderService,
    listOrdersService,
    listOrdersByEmailService,
    createOrderService,
    updateOrderService,
    deleteOrderService,
} from '../services/orders.js';

export const ordersController = () => {
    const isOwnerOrAdmin = (orderEmail, req, res) => {
        if (req.user.role === 'admin' || req.user.email === orderEmail)
            return true;
        res.status(403).json({
            message: 'Forbidden: insufficient permissions',
        });
        return false;
    };

    const getOrder = async (req, res, next) => {
        try {
            const order = await getOrderService(req.params.id);
            if (!order)
                return res.status(404).json({ message: 'Order not found' });
            if (!isOwnerOrAdmin(order.email, req, res)) return;
            return res.status(200).json(order);
        } catch (error) {
            next(error);
        }
    };

    const listOrders = async (req, res, next) => {
        try {
            const orders = await listOrdersService();
            return res.status(200).json(orders);
        } catch (error) {
            next(error);
        }
    };

    const listOrdersByEmail = async (req, res, next) => {
        try {
            if (!isOwnerOrAdmin(req.params.email, req, res)) return;
            const orders = await listOrdersByEmailService(req.params.email);
            return res.status(200).json(orders);
        } catch (error) {
            next(error);
        }
    };

    const createOrder = async (req, res, next) => {
        try {
            const order = await createOrderService(req.body);
            return res.status(201).json(order);
        } catch (error) {
            next(error);
        }
    };

    const updateOrder = async (req, res, next) => {
        try {
            const order = await getOrderService(req.params.id);
            if (!order)
                return res.status(404).json({ message: 'Order not found' });
            if (!isOwnerOrAdmin(order.email, req, res)) return;
            const updated = await updateOrderService(req.params.id, req.body);
            return res.status(200).json(updated);
        } catch (error) {
            next(error);
        }
    };

    const deleteOrder = async (req, res, next) => {
        try {
            const order = await deleteOrderService(req.params.id);
            if (!order)
                return res.status(404).json({ message: 'Order not found' });
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
        deleteOrder,
    };
};
