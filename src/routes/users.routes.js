import { Router } from 'express';
import { usersController } from '../controllers/users.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';

const { getUser, listUsers } = usersController();

export const usersRouter = Router();

usersRouter.get('/:id', authMiddleware, getUser);
usersRouter.get('/', authMiddleware, roleMiddleware('admin'), listUsers);
