import mongoose from 'mongoose';
import { Order, VALID_TRANSITIONS } from '../db/models/order.model.js';
import { Product } from '../db/models/product.model.js';
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from './email.js';
import { logger } from '../utils/logger.js';
import { HttpError } from '../utils/http-error.js';

/**
 * Decrementa el stock de cada producto de forma atómica y condicional.
 * La query `{ sku, stock: { $gte: count } }` garantiza que el documento
 * solo se actualiza si hay stock suficiente en el momento exacto del update,
 * evitando la race condition entre "comprobar" y "decrementar".
 *
 * Si `session` está presente, la operación participa en la transacción
 * y cualquier fallo se revierte al abortarla, por lo que no hace falta
 * rollback manual. Sin sesión, el caller se encarga de revertir los
 * decrementos previos.
 *
 * @param {Array<{ sku, count }>} products - Líneas de producto del pedido
 * @param {mongoose.ClientSession|null} session - Sesión de transacción opcional
 * @throws {HttpError} 404 si algún SKU no existe, 400 si no hay stock
 */
const decrementStockAtomic = async (products, session = null) => {
    const applied = [];

    for (const { sku, count = 1 } of products) {
        const result = await Product.updateOne(
            { sku, stock: { $gte: count } },
            { $inc: { stock: -count } },
            session ? { session } : undefined,
        );

        if (result.matchedCount === 0) {
            // Sin transacción: revertimos manualmente los decrementos previos
            // antes de lanzar el error. Con transacción, el abort lo revierte todo.
            if (!session) {
                await Promise.all(
                    applied.map(({ sku: s, count: c }) =>
                        Product.updateOne({ sku: s }, { $inc: { stock: c } }),
                    ),
                );
            }

            // Distinguimos entre "no existe" y "sin stock" para devolver el código correcto
            const exists = await Product.exists({ sku });
            if (!exists) {
                throw new HttpError(`Product with SKU "${sku}" not found`, 404);
            }
            throw new HttpError(`Insufficient stock for SKU "${sku}"`, 400);
        }

        applied.push({ sku, count });
    }
};

/**
 * Comprueba si el cluster de MongoDB soporta transacciones.
 * Las transacciones requieren un replica set o un sharded cluster:
 * en una instancia standalone (común en desarrollo), `startTransaction`
 * lanza un error. Este check nos permite degradar con gracia.
 */
const supportsTransactions = () => {
    const topology = mongoose.connection?.client?.topology;
    const type = topology?.description?.type;
    return type === 'ReplicaSetWithPrimary' || type === 'Sharded';
};

/**
 * Construye el filtro para listar los pedidos de un usuario autenticado.
 * Los pedidos nuevos se asocian por userId. Los antiguos, que no tenían
 * userId, se siguen encontrando por email para no perder histórico.
 */
const buildOwnedOrdersFilter = (email, userId) => {
    if (!userId) return { email };

    return {
        $or: [
            { userId },
            { email, userId: { $exists: false } },
            { email, userId: null },
        ],
    };
};

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
 * Devuelve una página de todos los pedidos registrados.
 * Solo debe usarse en rutas protegidas por rol admin.
 *
 * @param {{ skip: number, limit: number }} pagination - Parámetros de paginación
 * @returns {Promise<{ data: Order[], total: number }>}
 */
export const listOrdersService = async ({ skip, limit }) => {
    const [data, total] = await Promise.all([
        Order.find().skip(skip).limit(limit),
        Order.countDocuments(),
    ]);
    return { data, total };
};

/**
 * Devuelve una página de pedidos asociados a un cliente.
 * Admin filtra por email; usuarios normales filtran por userId y mantienen
 * fallback por email para pedidos antiguos sin userId.
 *
 * @param {string} email - Email del cliente
 * @param {{ skip: number, limit: number }} pagination - Parámetros de paginación
 * @param {string|null} userId - ID del usuario autenticado, si aplica
 * @returns {Promise<{ data: Order[], total: number }>}
 */
export const listOrdersByEmailService = async (
    email,
    { skip, limit },
    userId = null,
) => {
    const filter = buildOwnedOrdersFilter(email, userId);
    const [data, total] = await Promise.all([
        Order.find(filter).skip(skip).limit(limit),
        Order.countDocuments(filter),
    ]);
    return { data, total };
};

/**
 * Crea un nuevo pedido y descuenta el stock de cada producto incluido.
 *
 * Si el cluster soporta transacciones (replica set / sharded), envolvemos
 * el decremento de stock y la creación del pedido en una sesión. Cualquier
 * fallo aborta la transacción y deja la BD consistente sin rollback manual.
 *
 * En standalone (típico en desarrollo) caemos al flujo sin sesión: primero
 * decrementamos con rollback manual si falla, luego creamos el pedido y, si
 * la creación falla, reponemos el stock.
 *
 * @param {object} data - Datos del pedido validados por Zod
 * @returns {Promise<Order>} El pedido creado
 * @throws {HttpError} Si algún producto no existe o no tiene stock suficiente
 */
export const createOrderService = async (data) => {
    if (supportsTransactions()) {
        const session = await mongoose.startSession();
        try {
            let order;
            await session.withTransaction(async () => {
                await decrementStockAtomic(data.products, session);
                const created = await Order.create([data], { session });
                order = created[0];
            });
            sendOrderConfirmationEmail(order).catch((err) =>
                logger.error(
                    'Failed to send order confirmation email:',
                    err.message,
                ),
            );
            return order;
        } finally {
            await session.endSession();
        }
    }

    // Fallback standalone: decremento atómico + rollback manual.
    await decrementStockAtomic(data.products);
    let order;
    try {
        order = await Order.create(data);
    } catch (err) {
        await Promise.all(
            data.products.map(({ sku, count = 1 }) =>
                Product.updateOne({ sku }, { $inc: { stock: count } }),
            ),
        );
        throw err;
    }

    sendOrderConfirmationEmail(order).catch((err) =>
        logger.error('Failed to send order confirmation email:', err.message),
    );

    return order;
};

/**
 * Actualiza un pedido existente.
 * No ajusta stock — para cambios de cantidades se debe borrar y recrear el pedido.
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
 * Cambia el estado de un pedido validando que la transición sea permitida.
 *
 * Solo se permiten las transiciones definidas en VALID_TRANSITIONS:
 *   pending → processing → shipped → delivered
 *       └──────────────────────────→ cancelled
 *
 * Los estados 'delivered' y 'cancelled' son finales: no admiten más cambios.
 *
 * @param {string} id - ID de MongoDB del pedido
 * @param {string} newStatus - Nuevo estado solicitado
 * @returns {Promise<Order>} El pedido con el estado actualizado
 * @throws {HttpError} Si el pedido no existe o la transición no está permitida
 */
export const updateOrderStatusService = async (id, newStatus) => {
    const order = await Order.findById(id);
    if (!order) {
        throw new HttpError('Order not found', 404);
    }

    const allowed = VALID_TRANSITIONS[order.status];

    // Si el array de transiciones permitidas no incluye el nuevo estado, lo rechazamos
    if (!allowed.includes(newStatus)) {
        throw new HttpError(
            `Invalid transition: cannot change status from "${order.status}" to "${newStatus}"`,
            400,
        );
    }

    order.status = newStatus;
    const updated = await order.save();

    // Notificamos al cliente del cambio de estado (no bloqueante)
    sendOrderStatusEmail(updated).catch((err) =>
        logger.error('Failed to send order status email:', err.message),
    );

    return updated;
};

/**
 * Elimina un pedido y repone el stock de cada producto incluido.
 *
 * Flujo:
 * 1. Busca el pedido para obtener sus productos antes de eliminarlo.
 * 2. Elimina el pedido.
 * 3. Repone el stock de cada producto con $inc.
 *
 * @param {string} id - ID de MongoDB del pedido
 * @returns {Promise<Order|null>} El pedido eliminado o null si no existía
 */
export const deleteOrderService = async (id) => {
    // Paso 1: obtenemos el pedido antes de borrarlo para saber qué stock reponer
    const order = await Order.findById(id);
    if (!order) return null;

    // Paso 2: eliminamos el pedido
    await Order.findByIdAndDelete(id);

    // Paso 3: reponemos el stock de cada producto
    await Promise.all(
        order.products.map(({ sku, count = 1 }) =>
            Product.updateOne({ sku }, { $inc: { stock: count } }),
        ),
    );

    return order;
};
