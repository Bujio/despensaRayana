import { Router } from 'express';
import { usersController } from '../controllers/users.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';

const { getUser, listUsers, updateUser, deleteUser } = usersController();

export const usersRouter = Router();

usersRouter.get('/', authMiddleware, roleMiddleware('admin'), listUsers);
usersRouter.get('/:id', authMiddleware, getUser);
usersRouter.patch('/:id', authMiddleware, updateUser);
usersRouter.delete('/:id', authMiddleware, roleMiddleware('admin'), deleteUser);
