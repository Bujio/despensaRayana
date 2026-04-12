import {
    getUserService,
    listUsersService,
    updateUserService,
    deleteUserService,
} from '../services/users.js';

export const usersController = () => {
    const isOwnerOrAdmin = (targetId, req, res) => {
        if (req.user.role === 'admin' || req.user.id === targetId) return true;
        res.status(403).json({
            message: 'Forbidden: insufficient permissions',
        });
        return false;
    };

    const getUser = async (req, res, next) => {
        try {
            if (!isOwnerOrAdmin(req.params.id, req, res)) return;
            const user = await getUserService(req.params.id);
            if (!user)
                return res.status(404).json({ message: 'User not found' });
            return res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    };

    const listUsers = async (req, res, next) => {
        try {
            const users = await listUsersService();
            return res.status(200).json(users);
        } catch (error) {
            next(error);
        }
    };

    const updateUser = async (req, res, next) => {
        try {
            if (!isOwnerOrAdmin(req.params.id, req, res)) return;
            if (req.body.role && req.user.role !== 'admin') {
                return res
                    .status(403)
                    .json({
                        message: 'Forbidden: only admins can change roles',
                    });
            }
            const user = await updateUserService(req.params.id, req.body);
            if (!user)
                return res.status(404).json({ message: 'User not found' });
            return res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    };

    const deleteUser = async (req, res, next) => {
        try {
            const user = await deleteUserService(req.params.id);
            if (!user)
                return res.status(404).json({ message: 'User not found' });
            return res
                .status(200)
                .json({ message: 'User deleted successfully' });
        } catch (error) {
            next(error);
        }
    };

    return { getUser, listUsers, updateUser, deleteUser };
};
