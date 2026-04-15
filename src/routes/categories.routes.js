import { Router } from 'express';
import { categoriesController } from '../controllers/categories.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { validateObjectId } from '../middlewares/objectid.middleware.js';
import {
    createCategorySchema,
    updateCategorySchema,
} from '../schemas/category.schema.js';

const {
    listCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
} = categoriesController();

export const categoriesRouter = Router();

/**
 * @openapi
 * tags:
 *   name: Categories
 *   description: Categorías del catálogo
 */

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: Lista todas las categorías activas
 *     security: []
 *     responses:
 *       200:
 *         description: Array de categorías
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Category' }
 * /categories/{id}:
 *   get:
 *     tags: [Categories]
 *     summary: Devuelve una categoría por ID
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Categoría }
 *       404: { description: No encontrada }
 */
// Lectura pública: cualquier visitante puede ver las categorías
categoriesRouter.get('/', listCategories);
categoriesRouter.get('/:id', validateObjectId, getCategory);

/**
 * @openapi
 * /categories:
 *   post:
 *     tags: [Categories]
 *     summary: Crea una nueva categoría (solo admin)
 *     responses:
 *       201: { description: Creada }
 * /categories/{id}:
 *   patch:
 *     tags: [Categories]
 *     summary: Actualiza una categoría (solo admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Actualizada }
 *   delete:
 *     tags: [Categories]
 *     summary: Soft delete de una categoría (solo admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Eliminada }
 *       409: { description: La categoría tiene productos asociados }
 */
// Escritura restringida a admins
categoriesRouter.post(
    '/',
    authMiddleware,
    roleMiddleware('admin'),
    validate(createCategorySchema),
    createCategory,
);
categoriesRouter.patch(
    '/:id',
    validateObjectId,
    authMiddleware,
    roleMiddleware('admin'),
    validate(updateCategorySchema),
    updateCategory,
);
categoriesRouter.delete(
    '/:id',
    validateObjectId,
    authMiddleware,
    roleMiddleware('admin'),
    deleteCategory,
);
