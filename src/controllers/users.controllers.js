import {
    getUserService,
    listUsersService,
    updateUserService,
    deleteUserService,
} from '../services/users.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { assertOwnerOrAdmin } from '../utils/authz.js';
import { HttpError } from '../utils/http-error.js';

export const usersController = () => {
    const getUser = async (req, res, next) => {
        try {
            assertOwnerOrAdmin(req, req.user.id === req.params.id);
            const user = await getUserService(req.params.id);
            if (!user) throw new HttpError('User not found', 404);
            return res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    };

    const listUsers = async (req, res, next) => {
        try {
            const pagination = getPagination(req.query);
            const { data, total } = await listUsersService(pagination);
            return res.status(200).json({
                data,
                pagination: buildPaginationMeta(
                    total,
                    pagination.page,
                    pagination.limit,
                ),
            });
        } catch (error) {
            next(error);
        }
    };

    const updateUser = async (req, res, next) => {
        try {
            assertOwnerOrAdmin(req, req.user.id === req.params.id);
            // Solo los admins pueden cambiar el rol de un usuario.
            // El schema de Zod ya permite role como opcional, así que llega
            // al controller y aquí decidimos si el caller tiene permiso.
            if (req.body.role && req.user.role !== 'admin') {
                throw new HttpError(
                    'Forbidden: only admins can change roles',
                    403,
                );
            }
            const user = await updateUserService(req.params.id, req.body);
            if (!user) throw new HttpError('User not found', 404);
            return res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    };

    const deleteUser = async (req, res, next) => {
        try {
            assertOwnerOrAdmin(req, req.user.id === req.params.id);
            const user = await deleteUserService(req.params.id);
            if (!user) throw new HttpError('User not found', 404);
            return res
                .status(200)
                .json({ message: 'User deleted successfully' });
        } catch (error) {
            next(error);
        }
    };

    return { getUser, listUsers, updateUser, deleteUser };
};
