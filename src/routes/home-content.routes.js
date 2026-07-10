import { Router } from 'express';
import { homeContentController } from '../controllers/home-content.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { updateHomeContentSchema } from '../schemas/home-content.schema.js';

const {
    getHomeContent,
    getPublicHomeContent,
    getAdminHomeContent,
    getHomeContentRevisions,
    restoreHomeContentRevision,
    updateHomeContent,
    uploadHomeImages,
} = homeContentController();

export const homeContentRouter = Router();

homeContentRouter.get('/', getHomeContent);
homeContentRouter.get('/public', getPublicHomeContent);
homeContentRouter.get(
    '/admin',
    authMiddleware,
    roleMiddleware('admin'),
    getAdminHomeContent,
);

homeContentRouter.get(
    '/admin/revisions',
    authMiddleware,
    roleMiddleware('admin'),
    getHomeContentRevisions,
);

homeContentRouter.patch(
    '/admin/revisions/:revisionId/restore',
    authMiddleware,
    roleMiddleware('admin'),
    restoreHomeContentRevision,
);
homeContentRouter.put(
    '/',
    authMiddleware,
    roleMiddleware('admin'),
    validate(updateHomeContentSchema),
    updateHomeContent,
);

homeContentRouter.post(
    '/images',
    authMiddleware,
    roleMiddleware('admin'),
    upload,
    uploadHomeImages,
);
