import { Router } from 'express';
import { cartController } from '../controllers/cart.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    addCartItemSchema,
    updateCartItemSchema,
} from '../schemas/cart.schema.js';

const { getCart, addItem, updateItem, removeItem, clearCart } =
    cartController();

export const cartRouter = Router();

// Todos los endpoints del carrito requieren autenticación
cartRouter.get('/', authMiddleware, getCart);
cartRouter.post('/items', authMiddleware, validate(addCartItemSchema), addItem);
cartRouter.patch(
    '/items/:sku',
    authMiddleware,
    validate(updateCartItemSchema),
    updateItem,
);
cartRouter.delete('/items/:sku', authMiddleware, removeItem);
cartRouter.delete('/', authMiddleware, clearCart);
