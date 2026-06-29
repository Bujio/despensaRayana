import { Router } from 'express';
import { homeContentController } from '../controllers/home-content.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateHomeContentSchema } from '../schemas/home-content.schema.js';

const { getHomeContent, updateHomeContent } = homeContentController();

export const homeContentRouter = Router();

homeContentRouter.get('/', getHomeContent);

homeContentRouter.put(
    '/',
    authMiddleware,
    roleMiddleware('admin'),
    validate(updateHomeContentSchema),
    updateHomeContent,
);
