import { Cart } from '../db/models/cart.model.js';
import { Product } from '../db/models/product.model.js';
import { HttpError } from '../utils/http-error.js';

/**
 * Obtiene el producto por SKU o lanza 404.
 *
 * @param {string} sku
 * @returns {Promise<Product>}
 */
const findProductOr404 = async (sku) => {
    const product = await Product.findOne({ sku });
    if (!product) {
        throw new HttpError(`Product with SKU "${sku}" not found`, 404);
    }
    return product;
};

const getOfferPrice = (product) => {
    const price = Number(product.price || 0);
    const offer = product.offer;
    if (!offer?.active || offer.type === 'none') return price;

    if (offer.type === 'percent') {
        return Math.max(price * (1 - Number(offer.value || 0) / 100), 0);
    }

    if (offer.type === 'amount') {
        return Math.max(price - Number(offer.value || 0), 0);
    }

    if (
        offer.type === 'bundle' &&
        Number(offer.bundleQuantity) > 0 &&
        Number(offer.bundlePayQuantity) > 0
    ) {
        return Math.max(
            price * (Number(offer.bundlePayQuantity) / Number(offer.bundleQuantity)),
            0,
        );
    }

    return price;
};

/**
 * Lanza 400 si la cantidad solicitada excede el stock disponible.
 *
 * Nota: el carrito es un "quiero comprar esto", no una reserva.
 * La garantía real de stock se aplica al crear el pedido
 * (ver `decrementStockAtomic` en orders.js). Esta validación es
 * best-effort para no dejar añadir cantidades sin sentido al carrito.
 */
const assertEnoughStock = (product, requestedQty) => {
    if (product.stock < requestedQty) {
        throw new HttpError(
            `Insufficient stock for SKU "${product.sku}": available ${product.stock}, requested ${requestedQty}`,
            400,
        );
    }
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
 * Usamos operaciones atómicas ($inc / $push) con filtros posicionales para
 * minimizar la ventana de race condition entre dos peticiones concurrentes
 * del mismo usuario (por ejemplo, doble click en "Añadir al carrito").
 *
 * @param {string} userId
 * @param {string} sku
 * @param {number} quantity
 * @returns {Promise<Cart>} El carrito actualizado
 */
export const addCartItemService = async (userId, sku, quantity) => {
    const product = await findProductOr404(sku);
    const price = getOfferPrice(product);

    // Intentamos incrementar atómicamente la cantidad si el item ya está en el
    // carrito. Si matchedCount es 0 significa que no había línea con ese SKU.
    const incResult = await Cart.updateOne(
        { userId, 'items.sku': sku },
        { $inc: { 'items.$.quantity': quantity }, $set: { 'items.$.price': price } },
    );

    if (incResult.matchedCount > 0) {
        // Releemos el carrito para validar que la nueva cantidad no excede stock.
        // Si se pasa, revertimos el $inc para dejarlo como estaba.
        const updated = await Cart.findOne({ userId });
        const item = updated.items.find((i) => i.sku === sku);
        if (item.quantity > product.stock) {
            await Cart.updateOne(
                { userId, 'items.sku': sku },
                { $inc: { 'items.$.quantity': -quantity } },
            );
            throw new HttpError(
                `Insufficient stock for SKU "${sku}": available ${product.stock}, requested ${item.quantity}`,
                400,
            );
        }
        return updated;
    }

    // No existía la línea: validamos stock y añadimos el item con $push.
    // upsert: true crea el carrito si el usuario no tenía aún.
    // `returnDocument: 'after'` es el reemplazo moderno de `new: true` en Mongoose 9.
    assertEnoughStock(product, quantity);
    return await Cart.findOneAndUpdate(
        { userId },
        { $push: { items: { sku, quantity, price } } },
        { returnDocument: 'after', upsert: true },
    );
};

/**
 * Actualiza la cantidad de un producto específico en el carrito.
 *
 * @param {string} userId
 * @param {string} sku
 * @param {number} quantity - Nueva cantidad (debe ser >= 1)
 * @returns {Promise<Cart>} El carrito actualizado
 * @throws {HttpError} Si el carrito o el producto no existen en él, o no hay stock
 */
export const updateCartItemService = async (userId, sku, quantity) => {
    const product = await findProductOr404(sku);
    const price = getOfferPrice(product);
    assertEnoughStock(product, quantity);

    // $set atómico sobre la línea concreta; el filtro 'items.sku' garantiza
    // que la operación solo actualiza si el SKU está presente en el carrito.
    const updated = await Cart.findOneAndUpdate(
        { userId, 'items.sku': sku },
        { $set: { 'items.$.quantity': quantity, 'items.$.price': price } },
        { returnDocument: 'after' },
    );

    if (!updated) {
        // Distinguimos entre "no hay carrito" y "no hay ese SKU en el carrito"
        const cart = await Cart.findOne({ userId });
        if (!cart) throw new HttpError('Cart not found', 404);
        throw new HttpError(`Item with SKU "${sku}" not found in cart`, 404);
    }

    return updated;
};

/**
 * Elimina un producto del carrito.
 *
 * @param {string} userId
 * @param {string} sku
 * @returns {Promise<Cart>} El carrito actualizado
 * @throws {HttpError} Si el carrito no existe
 */
export const removeCartItemService = async (userId, sku) => {
    // $pull elimina atómicamente del array cualquier línea con ese SKU
    const updated = await Cart.findOneAndUpdate(
        { userId },
        { $pull: { items: { sku } } },
        { returnDocument: 'after' },
    );
    if (!updated) throw new HttpError('Cart not found', 404);
    return updated;
};

/**
 * Vacía completamente el carrito del usuario.
 * Se usa tras convertir el carrito en pedido o manualmente.
 *
 * @param {string} userId
 * @returns {Promise<Cart>} El carrito vacío
 * @throws {HttpError} Si el carrito no existe
 */
export const clearCartService = async (userId) => {
    const updated = await Cart.findOneAndUpdate(
        { userId },
        { $set: { items: [] } },
        { returnDocument: 'after' },
    );
    if (!updated) throw new HttpError('Cart not found', 404);
    return updated;
};
