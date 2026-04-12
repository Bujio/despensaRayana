import { Order } from '../db/models/order.model.js';

/**
 * Obtiene un pedido por su ID.
 *
 * @param {string} id - ID de MongoDB del pedido
 * @returns {Promise<Order|null>} El pedido encontrado o null si no existe
 */
export const getOrderService = async (id) => {
    return await Order.findById(id);
};

/**
 * Devuelve todos los pedidos registrados.
 * Solo debe usarse en rutas protegidas por rol admin.
 *
 * @returns {Promise<Order[]>} Lista de todos los pedidos
 */
export const listOrdersService = async () => {
    return await Order.find();
};

/**
 * Devuelve todos los pedidos asociados a un email de cliente.
 * El email se busca tal cual viene; el modelo ya lo almacena en minúsculas.
 *
 * @param {string} email - Email del cliente
 * @returns {Promise<Order[]>} Lista de pedidos del cliente
 */
export const listOrdersByEmailService = async (email) => {
    return await Order.find({ email });
};

/**
 * Crea un nuevo pedido.
 *
 * @param {object} data - Datos del pedido validados por el schema de Zod
 * @returns {Promise<Order>} El pedido creado
 */
export const createOrderService = async (data) => {
    return await Order.create(data);
};

/**
 * Actualiza un pedido existente.
 *
 * @param {string} id - ID de MongoDB del pedido
 * @param {object} data - Campos a actualizar (parcial)
 * @returns {Promise<Order|null>} El pedido actualizado o null si no existe
 */
export const updateOrderService = async (id, data) => {
    return await Order.findByIdAndUpdate(id, data, {
        new: true, // devuelve el documento actualizado
        runValidators: true, // aplica las validaciones del schema de Mongoose
    });
};

/**
 * Elimina un pedido por su ID.
 *
 * @param {string} id - ID de MongoDB del pedido
 * @returns {Promise<Order|null>} El pedido eliminado o null si no existía
 */
export const deleteOrderService = async (id) => {
    return await Order.findByIdAndDelete(id);
};
