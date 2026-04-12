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

// Lectura pública: cualquier visitante puede ver las categorías
categoriesRouter.get('/', listCategories);
categoriesRouter.get('/:id', validateObjectId, getCategory);

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
