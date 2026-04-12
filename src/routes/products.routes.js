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
    updateProductSchema,
} from '../schemas/product.schema.js';

const {
    getProduct,
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadImages,
} = productsController();

export const productsRouter = Router();

// Lectura pública: cualquier visitante puede ver el catálogo sin autenticarse
productsRouter.get('/', listProducts);
productsRouter.get('/:id', validateObjectId, getProduct);

// Escritura restringida a admins, con rate limit para proteger la BD
productsRouter.post(
    '/',
    writeLimiter,
    authMiddleware,
    roleMiddleware('admin'),
    validate(createProductSchema),
    createProduct,
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
