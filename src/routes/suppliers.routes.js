import { Router } from 'express';
import { suppliersController } from '../controllers/suppliers.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validateObjectId } from '../middlewares/objectid.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { writeLimiter } from '../middlewares/ratelimit.middleware.js';
import {
    featuredSupplierSchema,
    registerSupplierSchema,
    rejectSupplierSchema,
    supplierInternalNotesSchema,
    updateSupplierProfileSchema,
} from '../schemas/supplier.schema.js';

const {
    approveSupplier,
    deactivateSupplier,
    deleteSupplier,
    getMySupplier,
    getSupplier,
    listSuppliers,
    reactivateSupplier,
    registerSupplier,
    rejectSupplier,
    setFeatured,
    setInternalNotes,
    updateMySupplier,
    uploadMySupplierImages,
    uploadMySupplierLogo,
    uploadMySupplierMainImage,
} = suppliersController();

export const suppliersRouter = Router();

suppliersRouter.post(
    '/register',
    writeLimiter,
    validate(registerSupplierSchema),
    registerSupplier,
);

suppliersRouter.get(
    '/',
    authMiddleware,
    roleMiddleware('admin'),
    listSuppliers,
);

suppliersRouter.get(
    '/me',
    authMiddleware,
    roleMiddleware('supplier'),
    getMySupplier,
);

suppliersRouter.patch(
    '/me',
    writeLimiter,
    authMiddleware,
    roleMiddleware('supplier'),
    validate(updateSupplierProfileSchema),
    updateMySupplier,
);

suppliersRouter.post(
    '/me/logo',
    writeLimiter,
    authMiddleware,
    roleMiddleware('supplier'),
    upload,
    uploadMySupplierLogo,
);

suppliersRouter.post(
    '/me/images',
    writeLimiter,
    authMiddleware,
    roleMiddleware('supplier'),
    upload,
    uploadMySupplierImages,
);

suppliersRouter.post(
    '/me/main-image',
    writeLimiter,
    authMiddleware,
    roleMiddleware('supplier'),
    upload,
    uploadMySupplierMainImage,
);

suppliersRouter.get(
    '/:id',
    validateObjectId,
    authMiddleware,
    roleMiddleware('admin'),
    getSupplier,
);

suppliersRouter.patch(
    '/:id/approve',
    writeLimiter,
    validateObjectId,
    authMiddleware,
    roleMiddleware('admin'),
    approveSupplier,
);

suppliersRouter.patch(
    '/:id/reject',
    writeLimiter,
    validateObjectId,
    authMiddleware,
    roleMiddleware('admin'),
    validate(rejectSupplierSchema),
    rejectSupplier,
);

suppliersRouter.patch(
    '/:id/deactivate',
    writeLimiter,
    validateObjectId,
    authMiddleware,
    roleMiddleware('admin'),
    deactivateSupplier,
);

suppliersRouter.delete(
    '/:id',
    writeLimiter,
    validateObjectId,
    authMiddleware,
    roleMiddleware('admin'),
    deleteSupplier,
);

suppliersRouter.patch(
    '/:id/reactivate',
    writeLimiter,
    validateObjectId,
    authMiddleware,
    roleMiddleware('admin'),
    reactivateSupplier,
);

suppliersRouter.patch(
    '/:id/featured',
    writeLimiter,
    validateObjectId,
    authMiddleware,
    roleMiddleware('admin'),
    validate(featuredSupplierSchema),
    setFeatured,
);

suppliersRouter.patch(
    '/:id/internal-notes',
    writeLimiter,
    validateObjectId,
    authMiddleware,
    roleMiddleware('admin'),
    validate(supplierInternalNotesSchema),
    setInternalNotes,
);
