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

/**
 * @openapi
 * tags:
 *   name: Cart
 *   description: Carrito del usuario autenticado
 */

/**
 * @openapi
 * /cart:
 *   get:
 *     tags: [Cart]
 *     summary: Devuelve el carrito actual del usuario
 *     responses:
 *       200:
 *         description: Carrito
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Cart' }
 *   delete:
 *     tags: [Cart]
 *     summary: Vacía el carrito
 *     responses:
 *       200: { description: Carrito vaciado }
 * /cart/items:
 *   post:
 *     tags: [Cart]
 *     summary: Añade un producto al carrito
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sku, quantity]
 *             properties:
 *               sku: { type: string }
 *               quantity: { type: integer, minimum: 1 }
 *     responses:
 *       200: { description: Carrito actualizado }
 *       400: { description: Stock insuficiente }
 *       404: { description: Producto no encontrado }
 * /cart/items/{sku}:
 *   patch:
 *     tags: [Cart]
 *     summary: Cambia la cantidad de una línea del carrito
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Carrito actualizado }
 *   delete:
 *     tags: [Cart]
 *     summary: Quita una línea del carrito
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Carrito actualizado }
 */
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
