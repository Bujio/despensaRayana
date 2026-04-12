import {
    getCartService,
    addCartItemService,
    updateCartItemService,
    removeCartItemService,
    clearCartService,
} from '../services/cart.js';

export const cartController = () => {
    const getCart = async (req, res, next) => {
        try {
            // req.user.id viene del JWT decodificado por authMiddleware
            const cart = await getCartService(req.user.id);
            return res.status(200).json(cart);
        } catch (error) {
            next(error);
        }
    };

    const addItem = async (req, res, next) => {
        try {
            const { sku, quantity } = req.body;
            const cart = await addCartItemService(req.user.id, sku, quantity);
            return res.status(200).json(cart);
        } catch (error) {
            next(error);
        }
    };

    const updateItem = async (req, res, next) => {
        try {
            // Normalizamos el SKU a mayúsculas para coincidir con los productos
            const cart = await updateCartItemService(
                req.user.id,
                req.params.sku.toUpperCase(),
                req.body.quantity,
            );
            return res.status(200).json(cart);
        } catch (error) {
            next(error);
        }
    };

    const removeItem = async (req, res, next) => {
        try {
            const cart = await removeCartItemService(
                req.user.id,
                req.params.sku.toUpperCase(),
            );
            return res.status(200).json(cart);
        } catch (error) {
            next(error);
        }
    };

    const clearCart = async (req, res, next) => {
        try {
            const cart = await clearCartService(req.user.id);
            return res.status(200).json(cart);
        } catch (error) {
            next(error);
        }
    };

    return { getCart, addItem, updateItem, removeItem, clearCart };
};
