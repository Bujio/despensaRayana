import { Router } from 'express';
import { usersController } from '../controllers/users.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { validateObjectId } from '../middlewares/objectid.middleware.js';
import { updateUserSchema } from '../schemas/user.schema.js';

const { getUser, listUsers, updateUser, deleteUser } = usersController();

export const usersRouter = Router();

/**
 * @openapi
 * tags:
 *   name: Users
 *   description: Gestión de usuarios
 */

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Lista usuarios (solo admin)
 *     responses:
 *       200: { description: Página de usuarios }
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Devuelve un usuario por ID (owner o admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Usuario }
 *       404: { description: No encontrado }
 *   patch:
 *     tags: [Users]
 *     summary: Actualiza un usuario (owner o admin; role solo por admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Actualizado }
 *   delete:
 *     tags: [Users]
 *     summary: Soft delete de un usuario (solo admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Eliminado }
 */
usersRouter.get('/', authMiddleware, roleMiddleware('admin'), listUsers);
usersRouter.get('/:id', validateObjectId, authMiddleware, getUser);
// validate solo en PATCH porque GET y DELETE no tienen body
usersRouter.patch(
    '/:id',
    validateObjectId,
    authMiddleware,
    validate(updateUserSchema),
    updateUser,
);
usersRouter.delete('/:id', validateObjectId, authMiddleware, deleteUser);
