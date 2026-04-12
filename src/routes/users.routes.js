import { Router } from 'express';
import { usersController } from '../controllers/users.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateUserSchema } from '../schemas/user.schema.js';

const { getUser, listUsers, updateUser, deleteUser } = usersController();

export const usersRouter = Router();

usersRouter.get('/', authMiddleware, roleMiddleware('admin'), listUsers);
usersRouter.get('/:id', authMiddleware, getUser);
// validate solo en PATCH porque GET y DELETE no tienen body
usersRouter.patch(
    '/:id',
    authMiddleware,
    validate(updateUserSchema),
    updateUser,
);
usersRouter.delete('/:id', authMiddleware, roleMiddleware('admin'), deleteUser);
