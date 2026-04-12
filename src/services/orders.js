import { Order, VALID_TRANSITIONS } from '../db/models/order.model.js';
import { Product } from '../db/models/product.model.js';

/**
 * Verifica que todos los productos del pedido tienen stock suficiente
 * y devuelve los documentos de cada producto para no consultarlos dos veces.
 *
 * @param {Array<{ sku, count }>} products - Líneas de producto del pedido
 * @returns {Promise<Map<string, Product>>} Mapa SKU → documento de producto
 * @throws {Error} Si algún producto no existe o no tiene stock suficiente
 */
const checkAndFetchStock = async (products) => {
    const productMap = new Map();

    for (const { sku, count = 1 } of products) {
        const product = await Product.findOne({ sku });

        if (!product) {
            throw Object.assign(
                new Error(`Product with SKU "${sku}" not found`),
                { status: 404 },
            );
        }

        if (product.stock < count) {
            throw Object.assign(
                new Error(
                    `Insufficient stock for SKU "${sku}": available ${product.stock}, requested ${count}`,
                ),
                { status: 400 },
            );
        }

        productMap.set(sku, product);
    }

    return productMap;
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
 * Devuelve una página de pedidos asociados a un email de cliente.
 *
 * @param {string} email - Email del cliente
 * @param {{ skip: number, limit: number }} pagination - Parámetros de paginación
 * @returns {Promise<{ data: Order[], total: number }>}
 */
export const listOrdersByEmailService = async (email, { skip, limit }) => {
    const [data, total] = await Promise.all([
        Order.find({ email }).skip(skip).limit(limit),
        Order.countDocuments({ email }),
    ]);
    return { data, total };
};

/**
 * Crea un nuevo pedido y descuenta el stock de cada producto incluido.
 *
 * Flujo:
 * 1. Verifica que todos los productos existen y tienen stock suficiente.
 * 2. Crea el pedido en la base de datos.
 * 3. Descuenta las unidades vendidas de cada producto con $inc.
 *
 * Si la verificación de stock falla, se lanza un error antes de crear el pedido,
 * por lo que no queda ningún dato inconsistente.
 *
 * @param {object} data - Datos del pedido validados por Zod
 * @returns {Promise<Order>} El pedido creado
 * @throws {Error} Si algún producto no existe o no tiene stock suficiente
 */
export const createOrderService = async (data) => {
    // Paso 1: verificamos stock de todos los productos antes de crear nada
    await checkAndFetchStock(data.products);

    // Paso 2: creamos el pedido
    const order = await Order.create(data);

    // Paso 3: descontamos stock usando $inc (operación atómica por documento)
    await Promise.all(
        data.products.map(({ sku, count = 1 }) =>
            Product.updateOne({ sku }, { $inc: { stock: -count } }),
        ),
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
 * @throws {Error} Si el pedido no existe o la transición no está permitida
 */
export const updateOrderStatusService = async (id, newStatus) => {
    const order = await Order.findById(id);
    if (!order) {
        throw Object.assign(new Error('Order not found'), { status: 404 });
    }

    const allowed = VALID_TRANSITIONS[order.status];

    // Si el array de transiciones permitidas no incluye el nuevo estado, lo rechazamos
    if (!allowed.includes(newStatus)) {
        throw Object.assign(
            new Error(
                `Invalid transition: cannot change status from "${order.status}" to "${newStatus}"`,
            ),
            { status: 400 },
        );
    }

    order.status = newStatus;
    return await order.save();
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
