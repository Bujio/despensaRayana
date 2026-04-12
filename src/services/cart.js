import { Cart } from '../db/models/cart.model.js';
import { Product } from '../db/models/product.model.js';

/**
 * Busca el producto por SKU y verifica que tiene stock suficiente.
 *
 * @param {string} sku
 * @param {number} quantity
 * @returns {Promise<Product>} El producto encontrado
 * @throws {Error} Si no existe o no hay stock
 */
const validateStock = async (sku, quantity) => {
    const product = await Product.findOne({ sku });

    if (!product) {
        throw Object.assign(new Error(`Product with SKU "${sku}" not found`), {
            status: 404,
        });
    }

    if (product.stock < quantity) {
        throw Object.assign(
            new Error(
                `Insufficient stock for SKU "${sku}": available ${product.stock}, requested ${quantity}`,
            ),
            { status: 400 },
        );
    }

    return product;
};

/**
 * Devuelve el carrito del usuario, o un carrito vacío si no existe.
 *
 * @param {string} userId
 * @returns {Promise<Cart>}
 */
export const getCartService = async (userId) => {
    const cart = await Cart.findOne({ userId });
    // Si no tiene carrito aún devolvemos una estructura vacía consistente
    return cart ?? { userId, items: [] };
};

/**
 * Añade un producto al carrito del usuario.
 * Si el producto ya está en el carrito, suma la cantidad.
 * Si el carrito no existe, lo crea (upsert).
 *
 * @param {string} userId
 * @param {string} sku
 * @param {number} quantity
 * @returns {Promise<Cart>} El carrito actualizado
 */
export const addCartItemService = async (userId, sku, quantity) => {
    const product = await validateStock(sku, quantity);

    const cart = await Cart.findOne({ userId });

    if (!cart) {
        // Primer producto: creamos el carrito
        return await Cart.create({
            userId,
            items: [{ sku, quantity, price: product.price }],
        });
    }

    const existingItem = cart.items.find((item) => item.sku === sku);

    if (existingItem) {
        // El producto ya está en el carrito: verificamos stock total y sumamos
        await validateStock(sku, existingItem.quantity + quantity);
        existingItem.quantity += quantity;
    } else {
        // Producto nuevo en el carrito
        cart.items.push({ sku, quantity, price: product.price });
    }

    return await cart.save();
};

/**
 * Actualiza la cantidad de un producto específico en el carrito.
 *
 * @param {string} userId
 * @param {string} sku
 * @param {number} quantity - Nueva cantidad (debe ser >= 1)
 * @returns {Promise<Cart>} El carrito actualizado
 * @throws {Error} Si el carrito o el producto no existen en él
 */
export const updateCartItemService = async (userId, sku, quantity) => {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
        throw Object.assign(new Error('Cart not found'), { status: 404 });
    }

    const item = cart.items.find((i) => i.sku === sku);
    if (!item) {
        throw Object.assign(
            new Error(`Item with SKU "${sku}" not found in cart`),
            { status: 404 },
        );
    }

    // Verificamos que hay stock suficiente para la nueva cantidad
    await validateStock(sku, quantity);
    item.quantity = quantity;

    return await cart.save();
};

/**
 * Elimina un producto del carrito.
 *
 * @param {string} userId
 * @param {string} sku
 * @returns {Promise<Cart>} El carrito actualizado
 * @throws {Error} Si el carrito no existe
 */
export const removeCartItemService = async (userId, sku) => {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
        throw Object.assign(new Error('Cart not found'), { status: 404 });
    }

    // $pull elimina del array todos los elementos que coincidan con el filtro
    cart.items = cart.items.filter((item) => item.sku !== sku);

    return await cart.save();
};

/**
 * Vacía completamente el carrito del usuario.
 * Se usa tras convertir el carrito en pedido o manualmente.
 *
 * @param {string} userId
 * @returns {Promise<Cart>} El carrito vacío
 * @throws {Error} Si el carrito no existe
 */
export const clearCartService = async (userId) => {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
        throw Object.assign(new Error('Cart not found'), { status: 404 });
    }

    cart.items = [];
    return await cart.save();
};
