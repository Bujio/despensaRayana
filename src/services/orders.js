import { Order } from '../db/models/order.model.js';

export const getOrderService = async (id) => {
    return await Order.findById(id);
};

export const listOrdersService = async () => {
    return await Order.find();
};

export const listOrdersByEmailService = async (email) => {
    return await Order.find({ email });
};

export const createOrderService = async (data) => {
    return await Order.create(data);
};

export const updateOrderService = async (id, data) => {
    return await Order.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
    });
};

export const deleteOrderService = async (id) => {
    return await Order.findByIdAndDelete(id);
};
