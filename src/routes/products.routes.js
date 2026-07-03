import { Router } from 'express';
import { productsController } from '../controllers/products.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { validateObjectId } from '../middlewares/objectid.middleware.js';
import { writeLimiter } from '../middlewares/ratelimit.middleware.js';
import {
    createProductSchema,
    createSupplierProductSchema,
    updateProductSchema,
    updateSupplierProductSchema,
} from '../schemas/product.schema.js';

const {
    getProduct,
    listProducts,
    createProduct,
    createSupplierProduct,
    listSupplierProducts,
    updateProduct,
    updateSupplierProduct,
    deleteProduct,
    uploadImages,
} = productsController();

export const productsRouter = Router();

/**
 * @openapi
 * tags:
 *   name: Products
 *   description: Catálogo de productos
 */

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: Lista paginada del catálogo con filtros opcionales
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Búsqueda full-text sobre nombre y descripción
 *       - in: query
 *         name: inStock
 *         schema: { type: boolean }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name, price, stock, createdAt]
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Página de productos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Product' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 */
productsRouter.get('/', listProducts);
productsRouter.get(
    '/admin/all',
    authMiddleware,
    roleMiddleware('admin'),
    (req, _res, next) => {
        req.adminList = true;
        next();
    },
    listProducts,
);
productsRouter.get(
    '/supplier/my',
    authMiddleware,
    roleMiddleware('supplier'),
    listSupplierProducts,
);

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Devuelve un producto por su ID
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Producto
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Product' }
 *       404: { description: No encontrado }
 */
productsRouter.get('/:id', validateObjectId, getProduct);

/**
 * @openapi
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Crea un nuevo producto (solo admin)
 *     responses:
 *       201: { description: Creado }
 *       401: { description: No autenticado }
 *       403: { description: No autorizado }
 */
// Escritura restringida a admins, con rate limit para proteger la BD
productsRouter.post(
    '/',
    writeLimiter,
    authMiddleware,
    roleMiddleware('admin'),
    validate(createProductSchema),
    createProduct,
);
productsRouter.post(
    '/supplier',
    writeLimiter,
    authMiddleware,
    roleMiddleware('supplier'),
    validate(createSupplierProductSchema),
    createSupplierProduct,
);

/**
 * @openapi
 * /products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Actualiza un producto (solo admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Actualizado }
 *       404: { description: No encontrado }
 *   delete:
 *     tags: [Products]
 *     summary: Soft delete de un producto (solo admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Eliminado }
 *       404: { description: No encontrado }
 */
productsRouter.patch(
    '/supplier/:id',
    writeLimiter,
    validateObjectId,
    authMiddleware,
    roleMiddleware('supplier'),
    validate(updateSupplierProductSchema),
    updateSupplierProduct,
);
productsRouter.patch(
    '/:id',
    writeLimiter,
    validateObjectId,
    authMiddleware,
    roleMiddleware('admin'),
    validate(updateProductSchema),
    updateProduct,
);
productsRouter.delete(
    '/:id',
    writeLimiter,
    validateObjectId,
    authMiddleware,
    roleMiddleware('admin'),
    deleteProduct,
);

/**
 * @openapi
 * /products/{id}/images:
 *   post:
 *     tags: [Products]
 *     summary: Sube imágenes al producto (multipart, campo "images", máx. 5)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       200: { description: Producto con las imágenes añadidas }
 */
// Subida de imágenes: multipart/form-data, campo "images" (máx. 5 archivos).
// writeLimiter también aquí para evitar uploads masivos a Cloudinary (coste real).
productsRouter.post(
    '/:id/images',
    writeLimiter,
    validateObjectId,
    authMiddleware,
    roleMiddleware('admin'),
    upload,
    uploadImages,
);
